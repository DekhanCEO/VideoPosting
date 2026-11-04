#!/usr/bin/env bash
# Télécharge les modèles locaux (hors dépôt git) depuis les releases GitHub de sherpa-onnx :
#  - voix Piper française fr_FR-siwis-medium (TTS de repli quand aucune clé ElevenLabs n'est fournie) ;
#  - reconnaissance vocale française (zipformer en flux), utilisée uniquement par scripts/verify.py.
set -euo pipefail
cd "$(dirname "$0")/../models" 2>/dev/null || { mkdir -p "$(dirname "$0")/../models"; cd "$(dirname "$0")/../models"; }
BASE=https://github.com/k2-fsa/sherpa-onnx/releases/download
for m in tts-models/vits-piper-fr_FR-siwis-medium asr-models/sherpa-onnx-streaming-zipformer-fr-2023-04-14; do
  name=$(basename "$m")
  if [ -d "$name" ]; then echo "déjà présent : $name"; continue; fi
  echo "téléchargement : $name"
  curl -fsSL "$BASE/$m.tar.bz2" | tar xj
done
