#!/usr/bin/env python3
"""
PromptPilot — Whisper Fine-Tuning Scaffold
Fine-tunes openai/whisper-small (or any Whisper variant) on a downloaded speech dataset.

Requirements:
  pip install transformers datasets accelerate librosa soundfile evaluate jiwer torch

Usage:
  python scripts/whisper_finetune.py \
    --dataset_name mozilla-foundation/common_voice_13_0 \
    --language en \
    --model_name openai/whisper-small \
    --output_dir ./models/whisper-interview \
    --num_epochs 3 \
    --batch_size 8

  # Or from a local saved dataset:
  python scripts/whisper_finetune.py \
    --local_dataset ./data/common_voice_train \
    --model_name openai/whisper-small \
    --output_dir ./models/whisper-interview
"""

import argparse
import os
import sys

def check_deps():
    missing = []
    for pkg in ["transformers", "datasets", "accelerate", "librosa", "evaluate", "torch"]:
        try: __import__(pkg)
        except ImportError: missing.append(pkg)
    if missing:
        print(f"❌ Missing packages: {', '.join(missing)}")
        print(f"   Install with: pip install {' '.join(missing)}")
        sys.exit(1)

def prepare_dataset(ds, feature_extractor, tokenizer, max_audio_length_s=30):
    from datasets import Audio
    ds = ds.cast_column("audio", Audio(sampling_rate=16_000))

    def preprocess(batch):
        audio = batch["audio"]
        inputs = feature_extractor(audio["array"], sampling_rate=audio["sampling_rate"],
                                   max_length=int(max_audio_length_s * 16_000), truncation=True)
        batch["input_features"] = inputs.input_features[0]
        text = batch.get("sentence") or batch.get("text") or batch.get("transcription") or ""
        batch["labels"] = tokenizer(text.strip()).input_ids
        return batch

    return ds.map(preprocess, remove_columns=ds.column_names)


def main():
    check_deps()

    from transformers import (WhisperFeatureExtractor, WhisperTokenizer,
                               WhisperProcessor, WhisperForConditionalGeneration,
                               Seq2SeqTrainer, Seq2SeqTrainingArguments)
    from datasets import load_dataset, load_from_disk
    import torch
    import evaluate
    import numpy as np

    parser = argparse.ArgumentParser(description="Whisper Fine-Tuning for Interview Speech")
    parser.add_argument("--model_name",     default="openai/whisper-small")
    parser.add_argument("--dataset_name",   default=None, help="HF dataset ID")
    parser.add_argument("--local_dataset",  default=None, help="Path to local saved dataset")
    parser.add_argument("--language",       default="en")
    parser.add_argument("--output_dir",     default="./models/whisper-interview")
    parser.add_argument("--num_epochs",     type=int,   default=3)
    parser.add_argument("--batch_size",     type=int,   default=8)
    parser.add_argument("--learning_rate",  type=float, default=1e-5)
    parser.add_argument("--max_steps",      type=int,   default=-1, help="Override epochs with fixed steps")
    parser.add_argument("--warmup_steps",   type=int,   default=200)
    parser.add_argument("--eval_steps",     type=int,   default=500)
    parser.add_argument("--save_steps",     type=int,   default=500)
    parser.add_argument("--fp16",           action="store_true", default=torch.cuda.is_available())
    args = parser.parse_args()

    os.makedirs(args.output_dir, exist_ok=True)
    print(f"\n🧠 PromptPilot — Whisper Fine-Tuning")
    print(f"   Model:     {args.model_name}")
    print(f"   Language:  {args.language}")
    print(f"   Output:    {args.output_dir}")
    print(f"   FP16:      {args.fp16}")
    print(f"   Device:    {'CUDA' if torch.cuda.is_available() else 'CPU (slow)'}\n")

    # Load model components
    print("📦 Loading model components…")
    feature_extractor = WhisperFeatureExtractor.from_pretrained(args.model_name)
    tokenizer = WhisperTokenizer.from_pretrained(args.model_name, language=args.language, task="transcribe")
    processor = WhisperProcessor.from_pretrained(args.model_name, language=args.language, task="transcribe")
    model = WhisperForConditionalGeneration.from_pretrained(args.model_name)
    model.generation_config.language = args.language
    model.generation_config.task = "transcribe"
    model.generation_config.forced_decoder_ids = None

    # Load dataset
    print("📂 Loading dataset…")
    if args.local_dataset:
        raw = load_from_disk(args.local_dataset)
    elif args.dataset_name:
        if "common_voice" in args.dataset_name:
            raw = load_dataset(args.dataset_name, args.language, trust_remote_code=True)
        else:
            raw = load_dataset(args.dataset_name)
    else:
        print("❌ Provide --dataset_name or --local_dataset"); sys.exit(1)

    train_ds = raw["train"]   if "train"      in raw else raw
    eval_ds  = raw["validation"] if "validation" in raw else raw["test"] if "test" in raw else train_ds.select(range(min(500, len(train_ds))))

    print(f"   Train: {len(train_ds):,} | Eval: {len(eval_ds):,}")

    # Preprocess
    print("⚙️  Preprocessing audio…")
    train_ds = prepare_dataset(train_ds, feature_extractor, tokenizer)
    eval_ds  = prepare_dataset(eval_ds,  feature_extractor, tokenizer)

    # Data collator
    from dataclasses import dataclass
    from typing import Any, Dict, List, Union

    @dataclass
    class DataCollator:
        processor: Any
        def __call__(self, features: List[Dict[str, Any]]) -> Dict[str, torch.Tensor]:
            import torch
            input_features = [{"input_features": f["input_features"]} for f in features]
            batch = self.processor.feature_extractor.pad(input_features, return_tensors="pt")
            label_features = [{"input_ids": f["labels"]} for f in features]
            labels_batch = self.processor.tokenizer.pad(label_features, return_tensors="pt")
            labels = labels_batch["input_ids"].masked_fill(labels_batch.attention_mask.ne(1), -100)
            if (labels[:, 0] == self.processor.tokenizer.bos_token_id).all().cpu().item():
                labels = labels[:, 1:]
            batch["labels"] = labels
            return batch

    collator = DataCollator(processor=processor)
    metric = evaluate.load("wer")

    def compute_metrics(pred):
        pred_ids = pred.predictions
        label_ids = pred.label_ids
        label_ids[label_ids == -100] = tokenizer.pad_token_id
        pred_str  = tokenizer.batch_decode(pred_ids,  skip_special_tokens=True)
        label_str = tokenizer.batch_decode(label_ids, skip_special_tokens=True)
        wer = 100 * metric.compute(predictions=pred_str, references=label_str)
        return {"wer": wer}

    # Training args
    training_args = Seq2SeqTrainingArguments(
        output_dir=args.output_dir,
        per_device_train_batch_size=args.batch_size,
        per_device_eval_batch_size=max(1, args.batch_size // 2),
        gradient_accumulation_steps=1,
        learning_rate=args.learning_rate,
        warmup_steps=args.warmup_steps,
        num_train_epochs=args.num_epochs,
        max_steps=args.max_steps if args.max_steps > 0 else -1,
        gradient_checkpointing=True,
        fp16=args.fp16,
        evaluation_strategy="steps",
        eval_steps=args.eval_steps,
        save_steps=args.save_steps,
        logging_steps=50,
        load_best_model_at_end=True,
        metric_for_best_model="wer",
        greater_is_better=False,
        push_to_hub=False,
        predict_with_generate=True,
        generation_max_length=225,
        report_to="none",
    )

    trainer = Seq2SeqTrainer(
        model=model,
        args=training_args,
        train_dataset=train_ds,
        eval_dataset=eval_ds,
        data_collator=collator,
        compute_metrics=compute_metrics,
        tokenizer=processor.feature_extractor,
    )

    print("\n🚀 Starting fine-tuning…")
    trainer.train()

    model.save_pretrained(args.output_dir)
    processor.save_pretrained(args.output_dir)
    print(f"\n✅ Model saved to {args.output_dir}")
    print("   Use with: from transformers import pipeline")
    print(f"   pipe = pipeline('automatic-speech-recognition', model='{args.output_dir}')")


if __name__ == "__main__":
    main()
