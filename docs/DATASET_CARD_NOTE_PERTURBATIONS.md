# Dataset Card: Note Perturbations

## Overview
- **Name:** Counterfeit Detection Synthetic Perturbations
- **Format:** JSON Manifest (`counterfeit_dataset.json`)
- **Size:** 30 samples

## Composition
This dataset contains metadata definitions for perturbing a baseline "genuine" currency template to test classical vision systems. Perturbations include:
- `blur` (Gaussian, Motion)
- `glare` (Exposure spikes)
- `color_shift` (RGB channel anomalies)
- `duplicate_serial`

## Provenance
Fully synthetic. No real currency templates are distributed in this repository. All generated images are created dynamically via Pillow for testing purposes.
