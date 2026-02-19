#!/usr/bin/env python3
"""
PromptPilot Audio Dataset Downloader
Downloads curated speech datasets for Whisper fine-tuning.

Usage:
  python scripts/audio_datasets.py --dataset common_voice --language en
  python scripts/audio_datasets.py --dataset librispeech --split train-clean-100
  python scripts/audio_datasets.py --dataset voxpopuli  --language en
  python scripts/audio_datasets.py --dataset tedlium3
  python scripts/audio_datasets.py --list
"""

import argparse
import sys
import os

DATASETS = {
    "common_voice": {
        "name": "Mozilla Common Voice 13 (Hugging Face)",
        "hf_id": "mozilla-foundation/common_voice_13_0",
        "size": "~28 GB (English)",
        "license": "CC0",
        "splits": ["train", "validation", "test"],
        "requires_auth": True,
        "notes": "Requires Hugging Face account & accepting the dataset license at https://huggingface.co/datasets/mozilla-foundation/common_voice_13_0",
    },
    "librispeech": {
        "name": "LibriSpeech",
        "hf_id": "openslr/librispeech_asr",
        "size": "6.3 GB (train-clean-100) / 55 GB (train-other-960)",
        "license": "CC BY 4.0",
        "splits": ["train.clean.100", "train.clean.360", "train.other.500", "validation.clean", "test.clean"],
        "requires_auth": False,
        "notes": "Clean read speech from audiobooks — great for baseline transcription accuracy.",
    },
    "voxpopuli": {
        "name": "VoxPopuli (Facebook Research)",
        "hf_id": "facebook/voxpopuli",
        "size": "~41 GB (English)",
        "license": "CC0",
        "splits": ["train", "validation", "test"],
        "requires_auth": False,
        "notes": "European Parliament speech — diverse accents, interview-style delivery.",
    },
    "tedlium3": {
        "name": "TEDLIUM Release 3",
        "hf_id": "LIUM/tedlium",
        "size": "~19 GB",
        "license": "CC BY-NC-ND 3.0",
        "splits": ["train", "validation", "test"],
        "requires_auth": False,
        "notes": "TED talks — excellent for interview prep (confident, structured speech).",
    },
}


def list_datasets():
    print("\n📦 Available Datasets:\n")
    for key, d in DATASETS.items():
        auth = "⚠️  Requires HF auth" if d["requires_auth"] else "✅ Public"
        print(f"  [{key}]  {d['name']}")
        print(f"           Size: {d['size']}   License: {d['license']}   {auth}")
        print(f"           {d['notes']}")
        print(f"           HF ID: {d['hf_id']}")
        print()


def download_dataset(dataset_key: str, language: str = "en", split: str = "train", output_dir: str = "./data"):
    try:
        from datasets import load_dataset
    except ImportError:
        print("❌ Missing dependency. Install with:\n   pip install datasets transformers soundfile librosa")
        sys.exit(1)

    if dataset_key not in DATASETS:
        print(f"❌ Unknown dataset '{dataset_key}'. Run with --list to see options.")
        sys.exit(1)

    meta = DATASETS[dataset_key]
    print(f"\n🎧 Downloading: {meta['name']}")
    print(f"   HF ID: {meta['hf_id']}")
    print(f"   Split: {split}   Language: {language}")
    print(f"   NOTE: {meta['notes']}\n")

    os.makedirs(output_dir, exist_ok=True)

    try:
        if dataset_key == "common_voice":
            ds = load_dataset(meta["hf_id"], language, split=split, trust_remote_code=True)
        elif dataset_key in ("voxpopuli",):
            ds = load_dataset(meta["hf_id"], language, split=split)
        elif dataset_key == "tedlium3":
            ds = load_dataset(meta["hf_id"], "release3", split=split)
        else:
            ds = load_dataset(meta["hf_id"], split=split)

        out_path = os.path.join(output_dir, f"{dataset_key}_{split}")
        ds.save_to_disk(out_path)
        print(f"✅ Saved {len(ds):,} samples to {out_path}")
        print(f"   Columns: {ds.column_names}")
    except Exception as e:
        print(f"❌ Download failed: {e}")
        if "authentication" in str(e).lower() or "gated" in str(e).lower():
            print("\n   → Run: huggingface-cli login")
            print(f"   → Accept the license at https://huggingface.co/datasets/{meta['hf_id']}")
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(description="PromptPilot Audio Dataset Downloader")
    parser.add_argument("--dataset",    help="Dataset key (e.g. common_voice, librispeech)")
    parser.add_argument("--language",   default="en", help="Language code (default: en)")
    parser.add_argument("--split",      default="train", help="Dataset split (default: train)")
    parser.add_argument("--output_dir", default="./data", help="Output directory")
    parser.add_argument("--list",       action="store_true", help="List available datasets")
    args = parser.parse_args()

    if args.list or not args.dataset:
        list_datasets()
        return

    download_dataset(args.dataset, args.language, args.split, args.output_dir)


if __name__ == "__main__":
    main()
