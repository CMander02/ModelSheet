#!/usr/bin/env bash
# ─── update-provider-icons.sh ───────────────────────────────────────────
# Download provider icons for ModelSheet with priority fallback chain:
#   1. LobeIcons static-png  ({name}-color.png / {name}.png)
#   2. HuggingFace org avatar
#   3. HuggingFace model icon (from first public model of that org)
#
# Usage:
#   ./scripts/update-provider-icons.sh                  # all missing
#   ./scripts/update-provider-icons.sh stepfun openai    # specific
#   ./scripts/update-provider-icons.sh --force stepfun   # re-download
#
# Config ───────────────────────────────────────────────────────────────────
ICONS_DIR="src/modelsheet-web/public/icons/providers"
DATA_FILE="data/models.json"
DEBUG=false
FORCE=false

# Providers that already have @lobehub/icons React components → skip
# (these are handled at build time via npm, not static PNGs)
declare -A LOBEHUB_COMPONENTS
LOBEHUB_COMPONENTS=(
  [antgroup]=1       [arcee]=1        [baai]=1       [baichuan]=1
  [bytedance]=1      [deepcogito]=1   [hunyuan]=1    [infinigence]=1
  [kimi]=1           [liquid]=1       [moonshot]=1   [nousresearch]=1
  [rwkv]=1           [skywork]=1      [snowflake]=1  [tii]=1
  [upstage]=1        [xiaomi]=1       [yandex]=1     [ant-group]=1
  [arcee-ai]=1       [bytedance-seed]=1
)

# ─── Helpers ─────────────────────────────────────────────────────────────
info()  { echo -e "  \e[36m→\e[0m $*"; }
ok()    { echo -e "  \e[32m✔\e[0m $*"; }
warn()  { echo -e "  \e[33m⚠\e[0m $*"; }
err()   { echo -e "  \e[31m✘\e[0m $*"; }

# Map provider display name → HF org slug
hf_org() {
  local name="$1"
  case "$name" in
    "Qwen"|"Damo Academy"|"alibaba-PAI"|"Alibaba-NLP")     echo "Qwen" ;;
    "DeepSeek")                                             echo "deepseek-ai" ;;
    "Zhipu AI")                                             echo "ChatGLM" ;;
    "Shanghai AI Lab"|"InternLM")                           echo "internlm" ;;
    "01.AI")                                                echo "01-ai" ;;
    "Meta"|"Llama Team")                                    echo "meta-llama" ;;
    "Mistral AI")                                           echo "mistralai" ;;
    "Google DeepMind"|"DeepMind")                           echo "google-deepmind" ;;
    "OpenAI")                                               echo "openai" ;;
    "Anthropic")                                            echo "anthropic" ;;
    "Microsoft")                                            echo "microsoft" ;;
    "Hugging Face")                                         echo "huggingface" ;;
    "Cohere")                                               echo "CohereForAI" ;;
    "Stability AI")                                         echo "stabilityai" ;;
    "NVIDIA")                                               echo "nvidia" ;;
    "AI21 Labs")                                            echo "ai21labs" ;;
    "AI-MO")                                                echo "AI-MO" ;;
    "xAI")                                                  echo "x-ai" ;;
    "Amazon")                                               echo "amazon" ;;
    "MiniMax")                                              echo "MiniMax-ai" ;;
    "BAAI")                                                 echo "BAAI" ;;
    "Baichuan"|"Baichuan AI")                               echo "baichuan-inc" ;;
    "BigScience")                                           echo "bigscience" ;;
    "iFlyTek")                                              echo "iFlyTek" ;;
    "Baidu")                                                echo "baidu" ;;
    "Meituan")                                              echo "meituan" ;;
    "ByteDance"|"ByteDance Seed"|"BytedTsinghua-SIA")       echo "bytedance" ;;
    "Xiaomi MiMo")                                          echo "xiaomi" ;;
    "Ant Group")                                            echo "antgroup" ;;
    "Infinigence")                                          echo "infinigence" ;;
    "Intel")                                                echo "intel" ;;
    "IBM")                                                  echo "ibm" ;;
    "Google")                                               echo "google" ;;
    "Moonshot AI")                                          echo "moonshot-ai" ;;
    "RWKV")                                                 echo "RWKV" ;;
    "Nous Research")                                        echo "NousResearch" ;;
    "RedNote Hi-Lab")                                       echo "rednote-hilab" ;;
    "Reka AI")                                              echo "reka-ai" ;;
    "AIDC-AI")                                              echo "aidc-ai" ;;
    "Open Thoughts")                                        echo "open-thoughts" ;;
    "TII")                                                  echo "tiiuae" ;;
    "Cursor")                                               echo "getcursor" ;;
    "Arcee AI")                                             echo "arcee-ai" ;;
    "Liquid AI")                                            echo "liquid-ai" ;;
    "Unsloth")                                              echo "unsloth" ;;
    "AI21")                                                 echo "ai21labs" ;;
    "Allen AI")                                             echo "allenai" ;;
    "Stepfun"|"Step")                                       echo "stepfun-ai" ;;
    "腾讯混元"|"Tencent Hunyun")                            echo "tencent" ;;
    "Skywork")                                              echo "Skywork" ;;
    "Deep Cogito")                                            echo "deepcogito" ;;
    "Cognitive Computations"|"dphn")                          echo "dolphin" ;;
    "Poolside")                                               echo "poolside" ;;
    "Snowflake")                                              echo "snowflake" ;;
    "Perplexity")                                           echo "perplexity-ai" ;;
    "Upstage")                                              echo "upstage" ;;
    "Yandex")                                               echo "yandex" ;;
    *)                                                      echo "$name" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' ;;
  esac
}

# Map provider display name → LobeIcons file key (lowercase)
lobe_key() {
  local name="$1"
  case "$name" in
    "Qwen"|"Damo Academy"|"alibaba-PAI"|"Alibaba-NLP")     echo "qwen" ;;
    "DeepSeek")                                             echo "deepseek" ;;
    "Zhipu AI")                                             echo "zhipu" ;;
    "Shanghai AI Lab"|"InternLM")                           echo "internlm" ;;
    "01.AI")                                                echo "yi" ;;
    "Meta"|"Llama Team")                                    echo "meta" ;;
    "Mistral AI")                                           echo "mistral" ;;
    "Google DeepMind"|"DeepMind")                           echo "deepmind" ;;
    "Hugging Face")                                         echo "huggingface" ;;
    "Cohere")                                               echo "cohere" ;;
    "Stability AI")                                         echo "stability" ;;
    "NVIDIA")                                               echo "nvidia" ;;
    "Microsoft")                                            echo "microsoft" ;;
    "AI21 Labs"|"AI21")                                     echo "ai21" ;;
    "Amazon")                                               echo "aws" ;;
    "MiniMax")                                              echo "minimax" ;;
    "BAAI")                                                 echo "baai" ;;
    "Baichuan"|"Baichuan AI")                               echo "baichuan" ;;
    "BigScience")                                           echo "bigscience" ;;
    "iFlyTek")                                              echo "spark" ;;
    "Baidu")                                                echo "baidu" ;;
    "Meituan")                                              echo "meituan" ;;
    "ByteDance"|"ByteDance Seed"|"BytedTsinghua-SIA")       echo "bytedance" ;;
    "Xiaomi MiMo")                                          echo "xiaomimimo" ;;
    "Ant Group")                                            echo "antgroup" ;;
    "Infinigence")                                          echo "infinigence" ;;
    "Tencent Hunyun")                                       echo "hunyuan" ;;
    "Skywork")                                              echo "skywork" ;;
    "AliExpress")                                           echo "aliexpress" ;;
    "Snowflake")                                            echo "snowflake" ;;
    "Perplexity")                                           echo "perplexity" ;;
    "Upstage")                                              echo "upstage" ;;
    "Yandex")                                               echo "yandex" ;;
    "Stepfun"|"Step")                                       echo "stepfun" ;;
    "Moonshot AI")                                          echo "moonshot" ;;
    "RWKV")                                                 echo "rwkv" ;;
    "Nous Research")                                        echo "nousresearch" ;;
    "Arcee AI")                                             echo "arcee" ;;
    "Liquid AI")                                            echo "liquid" ;;
    "Deep Cogito")                                          echo "deepcogito" ;;
    "Cognitive Computations"|"dphn")                        echo "dolphin" ;;
    "Cursor")                                               echo "cursor" ;;
    "Xiaomi")                                               echo "xiaomi" ;;
    "Intel")                                                echo "intel" ;;
    "Google")                                               echo "google" ;;
    *)                                                      echo "$name" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' ;;
  esac
}

# ─── Download helpers ────────────────────────────────────────────────────

# Try LobeIcons static PNG → saves to $1.png, returns 0 on success
try_lobeicons() {
  local output="$1" name="$2"
  local lobe_key="${3:-$name}"

  # Try color variant first (highest quality)
  local url="https://raw.githubusercontent.com/lobehub/lobe-icons/refs/heads/master/packages/static-png/light/${lobe_key}-color.png"
  if curl -sfL "$url" -o "${output}.tmp" 2>/dev/null; then
    mv "${output}.tmp" "$output"
    return 0
  fi

  # Fall back to mono
  url="https://raw.githubusercontent.com/lobehub/lobe-icons/refs/heads/master/packages/static-png/light/${lobe_key}.png"
  if curl -sfL "$url" -o "${output}.tmp" 2>/dev/null; then
    mv "${output}.tmp" "$output"
    return 0
  fi

  return 1
}

# Try HuggingFace org avatar
try_hf_org() {
  local output="$1" org="$2"
  local hf_url="https://huggingface.co/${org}"

  # Scrape the org page for avatar URL
  local avatar_url
  avatar_url=$(curl -sfL "$hf_url" 2>/dev/null \
    | grep -oP 'cdn-avatars\.huggingface\.co[^"]+\.(png|webp)' \
    | head -1)

  if [[ -n "$avatar_url" ]]; then
    if curl -sfL "https://${avatar_url}" -o "${output}.tmp" 2>/dev/null; then
      mv "${output}.tmp" "$output"
      return 0
    fi
  fi
  return 1
}

# Try HF model icon (first public model from that org)
try_hf_model() {
  local output="$1" org="$2"
  local api_url="https://huggingface.co/api/models?author=${org}&sort=downloads&direction=-1&limit=1"

  local model_id
  model_id=$(curl -sfL "$api_url" 2>/dev/null | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if isinstance(data, list) and len(data) > 0:
        print(data[0].get('modelId', ''))
except: pass
" 2>/dev/null)

  if [[ -z "$model_id" ]]; then return 1; fi

  local model_url="https://huggingface.co/${model_id}"
  local avatar_url
  avatar_url=$(curl -sfL "$model_url" 2>/dev/null \
    | grep -oP 'cdn-avatars\.huggingface\.co[^"]+\.(png|webp)' \
    | head -1)

  if [[ -n "$avatar_url" ]]; then
    if curl -sfL "https://${avatar_url}" -o "${output}.tmp" 2>/dev/null; then
      mv "${output}.tmp" "$output"
      return 0
    fi
  fi
  return 1
}

# ─── Main ────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$SCRIPT_DIR" || exit 1
[[ ! -d "$ICONS_DIR" ]] && mkdir -p "$ICONS_DIR"

# Parse args
SPECIFIC=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --force) FORCE=true; shift ;;
    --debug) DEBUG=true; shift ;;
    -h|--help)
      echo "Usage: $0 [--force] [--debug] [provider1 provider2 ...]"
      echo "  Default: scan all providers in data/models.json"
      exit 0 ;;
    *) SPECIFIC+=("$1"); shift ;;
  esac
done

echo -e "\n  \e[1mModelSheet — Provider Icon Updater\e[0m\n"

# Get all unique providers from data
if [[ ${#SPECIFIC[@]} -gt 0 ]]; then
  PROVIDERS=("${SPECIFIC[@]}")
else
  mapfile -t PROVIDERS < <(python3 -c "
import json
data = json.load(open('$DATA_FILE'))
providers = set()
for m in data:
    p = m.get('provider') or m.get('organization') or ''
    if p:
        providers.add(p)
for p in sorted(providers):
    print(p)
")
fi

TOTAL=${#PROVIDERS[@]}
OK_COUNT=0
SKIP_COUNT=0
FAIL_COUNT=0

for ((i=0; i<TOTAL; i++)); do
  provider="${PROVIDERS[$i]}"
  pct=$(( (i+1) * 100 / TOTAL ))

  # Normalize provider to a file-safe name
  file_name=$(echo "$provider" | tr '[:upper:]' '[:lower:]' | tr ' /' '-' | tr -s '-')
  file_path="${ICONS_DIR}/${file_name}.png"

  # Skip if already exists (unless --force)
  if [[ -f "$file_path" && "$FORCE" != true ]]; then
    ((SKIP_COUNT++))
    continue
  fi

  printf "\r  [%3d%%] %-40s" "$pct" "$provider"

  # Check if it has a LobeHub React component → skip (no static PNG needed)
  lobe_key=$(lobe_key "$provider")
  if [[ -n "${LOBEHUB_COMPONENTS[$lobe_key]:-}" ]] || [[ -n "${LOBEHUB_COMPONENTS[$file_name]:-}" ]]; then
    [[ $DEBUG == true ]] && echo -e "\r  \e[90m[%3d%%] %-40s ← lobehub component\e[0m" "$pct" "$provider"
    ((SKIP_COUNT++))
    continue
  fi

  # Priority 1: LobeIcons static PNG
  if [[ "$lobe_key" != "$provider" ]]; then
    if try_lobeicons "$file_path" "$provider" "$lobe_key"; then
      printf "\r  [%3d%%] \e[32m✔\e[0m %-40s (LobeIcons)\n" "$pct" "$provider"
      ((OK_COUNT++))
      continue
    fi
  fi

  if try_lobeicons "$file_path" "$provider" "$file_name"; then
    printf "\r  [%3d%%] \e[32m✔\e[0m %-40s (LobeIcons)\n" "$pct" "$provider"
    ((OK_COUNT++))
    continue
  fi

  # Priority 2: HF org avatar
  hf_slug=$(hf_org "$provider")
  if try_hf_org "$file_path" "$hf_slug"; then
    printf "\r  [%3d%%] \e[32m✔\e[0m %-40s (HF org)\n" "$pct" "$provider"
    ((OK_COUNT++))
    continue
  fi

  # Priority 3: HF model avatar (fallback)
  if try_hf_model "$file_path" "$hf_slug"; then
    printf "\r  [%3d%%] \e[32m✔\e[0m %-40s (HF model)\n" "$pct" "$provider"
    ((OK_COUNT++))
    continue
  fi

  printf "\r  [%3d%%] \e[31m✘\e[0m %-40s\n" "$pct" "$provider"
  ((FAIL_COUNT++))
done

echo
echo "  ────────────────────────────────────────"
echo "   Total: $TOTAL  |  ✔ $OK_COUNT  |  ⚠ $SKIP_COUNT  |  ✘ $FAIL_COUNT"
echo
