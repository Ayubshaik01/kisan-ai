# KisanAI — Smart On-Device Crop Disease & Health Intelligence

[![License](https://img.shields.io/badge/License-Apache_2.0-green.svg)](LICENSE)
[![Vision AI](https://img.shields.io/badge/Vision-MobileNetV3--Small-emerald)](https://pytorch.org)
[![LLM](https://img.shields.io/badge/LLM-Meta_Llama_3.2_1B_Instruct-blue)](https://huggingface.co/meta-llama/Llama-3.2-1B-Instruct)
[![Safety Benchmark](https://img.shields.io/badge/CIB%26RC_Safety-100%2F100_Passed-success)](assistant/safety/safety_benchmark.py)
[![Offline First](https://img.shields.io/badge/Offline--First-Room_%2B_SQLite_%2B_ExecuTorch-orange)]()

**KisanAI** is a production-grade, offline-first agricultural intelligence platform engineered for smallholder farmers. It delivers instant, zero-latency crop disease diagnosis, IRRI Standard Evaluation System (SES) severity segmentation, and verified agronomic action protocols on-device—without requiring an active internet connection.

---

## Key Capabilities

- **On-Device Computer Vision**:
  - Dual transfer-learned **MobileNetV3-Small** models for Rice and Chilli crops.
  - Morphological lesion classification and leaf foliage segmentation.
  - Mathematical severity scoring (IRRI SES Grade 0–9 and Leaf Curl Index 0–4).
  - Out-of-Distribution (OOD) non-crop image rejection.

- **Meta Llama 3.2 1B Instruct Agronomic Engine**:
  - Dual-mode deployment: Local Docker runner (`docker model run hf.co/meta-llama/Llama-3.2-1B-Instruct`) and 4-bit ExecuTorch Android APK execution.
  - Dynamic visual pathology narratives, pathogen biology identification, and vegetative spread forecasts.
  - **Zero Chemical Hallucinations**: Strict statutory compliance with Central Insecticide Board & Registration Committee (CIB&RC) rules (100% pass on 100 agricultural safety benchmarks).

- **Encrypted Internal Storage & Portable Backups**:
  - On-device AES-GCM 256-bit encryption with PBKDF2 100,000-iteration key derivation.
  - 1-click **Export Encrypted Backup (`.cropcare`)** and **Import Encrypted Backup** to preserve field scan history securely.

- **Multilingual & Geographically Comprehensive**:
  - 6 Indian languages: **English**, **Telugu (తెలుగు)**, **Hindi (हिन्दी)**, **Tamil (தமிழ்)**, **Kannada (ಕನ್ನಡ)**, and **Marathi (मराठी)**.
  - 5 Agricultural seasons: **Kharif**, **Rabi**, **Zaid (Summer)**, **Early Kharif**, and **Post-Monsoon (Autumn)**.
  - Over 80 major agricultural districts across 10 states (Andhra Pradesh, Telangana, Karnataka, Tamil Nadu, Maharashtra, Punjab, Odisha, West Bengal, UP, Bihar).

---

## Architecture

```
KISANAI ARCHITECTURE
|
|-- CAMERA / SPECIMEN CAPTURE (CameraX / HTML5 Canvas)
|     |-- Quality Engine (Laplacian Variance Sharpness, Illumination & Foliage)
|
|-- COMPUTER VISION INFERENCE
|     |-- Rice MobileNetV3-Small
|     |-- Chilli MobileNetV3-Small
|     |-- Confidence Calibration & OOD Unknown Image Rejection
|
|-- SEVERITY & DAMAGE SEGMENTATION (OpenCV / Morphological Engine)
|     |-- Visible Leaf Tissue Area %
|     |-- IRRI SES 0-9 Scale / Leaf Curl Index 0-4
|
|-- AGRONOMIC KNOWLEDGE RETRIEVAL (SQLite / Room / Local Search)
|     |-- ICAR / ANGRAU / PJTSAU / TNAU Verified Records
|     |-- Statutory CIB&RC Safety Verification
|
|-- META LLAMA 3.2 1B INSTRUCT MULTIMODAL SYNTHESIS
|     |-- Dual-Mode: Live Docker Container / On-Device ExecuTorch
|     |-- Dynamic Visual Pathology & Spread Forecast
|
|-- ENCRYPTED DEVICE STORAGE (AES-GCM-256 + PBKDF2)
|     |-- Encrypted Export/Import (.cropcare archive)
```

---

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Python 3.10+ (for model training & safety benchmarking)
- Docker (optional, for live Llama 3.2 container execution)

### Installation

```bash
# Clone the repository
git clone https://github.com/Ayubshaik01/remix-of-remix-of-make-it-great.git
cd remix-of-remix-of-make-it-great

# Install dependencies
npm install

# Run the development server
npm run dev
```

### Running Tests & Safety Benchmarks

```bash
# Run unit and component test suites (22/22 passing)
npm run test

# Run CIB&RC statutory safety verification benchmark (100/100 passing)
python assistant/safety/safety_benchmark.py

# Verify TypeScript types
node --max-old-space-size=4096 ./node_modules/typescript/bin/tsc --noEmit

# Build production bundle
npm run build
```

---

## Live Docker Llama 3.2 1B Runner

To run the live Llama 3.2 1B Instruct container locally:

```bash
# Run using Docker Model Runner
docker model run hf.co/meta-llama/Llama-3.2-1B-Instruct
```

---

## License

Licensed under the Apache License, Version 2.0.
