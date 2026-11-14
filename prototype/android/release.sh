#!/usr/bin/env bash
set +xv
set -euo pipefail
umask 077

if [[ $# -ne 3 ]]; then
    printf 'Usage: %s PRIVATE_SIGNING_ENV HTTPS_API_ORIGIN OUTPUT_APK\n' "$0" >&2
    exit 2
fi

signing_env=$1
origin=${2%/}
output=$3
origin_pattern='^https://([[:alnum:]][[:alnum:].-]*|\[[[:xdigit:]:]+\])(:[0-9]{1,5})?$'
if [[ ! $origin =~ $origin_pattern ]]; then
    printf 'API origin must use HTTPS without credentials, a path, query, or fragment.\n' >&2
    exit 2
fi
if [[ ! -f $signing_env || ! -r $signing_env ]]; then
    printf 'An explicit readable private signing env file is required.\n' >&2
    exit 2
fi
if [[ $output != *.apk || -e $output || -e $output.sha256 ]]; then
    printf 'Choose a new output .apk path with no existing APK or checksum.\n' >&2
    exit 2
fi

unset CHABUN_RELEASE_STORE_FILE CHABUN_RELEASE_STORE_PASSWORD CHABUN_RELEASE_KEY_ALIAS CHABUN_RELEASE_KEY_PASSWORD CHABUN_RELEASE_CERT_SHA256
set -a
source "$signing_env"
set +a
: "${CHABUN_RELEASE_STORE_FILE:?Missing release keystore path}"
: "${CHABUN_RELEASE_STORE_PASSWORD:?Missing release store password}"
: "${CHABUN_RELEASE_KEY_ALIAS:?Missing release key alias}"
: "${CHABUN_RELEASE_KEY_PASSWORD:?Missing release key password}"
: "${CHABUN_RELEASE_CERT_SHA256:?Missing expected release certificate SHA256}"
expected=$(printf '%s' "$CHABUN_RELEASE_CERT_SHA256" | tr '[:upper:]' '[:lower:]' | tr -d ':')
if [[ ! $expected =~ ^[0-9a-f]{64}$ || $CHABUN_RELEASE_KEY_ALIAS == androiddebugkey || $CHABUN_RELEASE_STORE_FILE != /* || ! -f $CHABUN_RELEASE_STORE_FILE ]]; then
    printf 'Require an absolute release keystore, a non-debug alias, and its certificate SHA256.\n' >&2
    exit 2
fi

project_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
export JAVA_HOME="${JAVA_HOME:-/Applications/Android Studio.app/Contents/jbr/Contents/Home}"
export PATH="$JAVA_HOME/bin:$PATH"
export ANDROID_HOME="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-$HOME/Library/Android/sdk}}"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
apksigner="$ANDROID_HOME/build-tools/${ANDROID_BUILD_TOOLS_VERSION:-36.0.0}/apksigner"
if [[ ! -x $JAVA_HOME/bin/java || ! -x $apksigner ]]; then
    printf 'Set JAVA_HOME to JDK 21 and install the selected Android build-tools containing apksigner.\n' >&2
    exit 2
fi

"$project_dir/gradlew" -p "$project_dir" --no-daemon --no-configuration-cache --console=plain \
    "-PCHABUN_API_BASE_URL=$origin" :app:assembleRelease
apk="$project_dir/app/build/outputs/apk/release/app-release.apk"
verification=$("$apksigner" verify --verbose --print-certs "$apk")
signers=0
actual=
while IFS= read -r line; do
    case "$line" in
        *"certificate DN: "*"CN=Android Debug"*)
            printf 'Refusing an APK signed with an Android debug certificate.\n' >&2
            exit 1
            ;;
        "Signer #"*" certificate SHA-256 digest: "*)
            actual=${line##*: }
            signers=$((signers + 1))
            ;;
    esac
done <<< "$verification"
if [[ $signers -ne 1 || $actual != "$expected" ]]; then
    printf 'APK signing certificate does not match the expected single release signer.\n' >&2
    exit 1
fi

mkdir -p -- "$(dirname -- "$output")"
cp -n -- "$apk" "$output"
(cd -- "$(dirname -- "$output")" && shasum -a 256 "$(basename -- "$output")") > "$output.sha256"
printf 'Release APK: %s\nSHA256 file: %s.sha256\nCertificate SHA256: %s\n' "$output" "$output" "$actual"
