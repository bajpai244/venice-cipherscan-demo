# Zcash mainnet viewing-key derivation

This utility derives a mainnet Unified Full Viewing Key (UFVK) from a BIP-39
seed phrase using Zakura's key libraries. Account `0` is used unless another
ZIP-32 account is selected.

```sh
./derive-viewing-key
```

The phrase is hidden while you type it. The command prints only the UFVK to
standard output, so you can copy it or send it directly to the clipboard:

```sh
./derive-viewing-key | wl-copy
```

For a different account or a mnemonic protected by a BIP-39 passphrase:

```sh
./derive-viewing-key --account 1 --passphrase
```

For automation, pipe the phrase through standard input. Be aware that shell
history, files, environment variables, and other processes may expose secrets;
interactive entry is preferred.

```sh
printf '%s\n' "$MNEMONIC" | ./derive-viewing-key
```

The first run downloads and compiles the Rust dependencies. Subsequent runs
reuse the compiled binary. A UFVK reveals incoming and outgoing transaction
details for the account, but does not grant spending authority; treat it as
sensitive nonetheless.
