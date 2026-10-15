use std::io::{self, IsTerminal, Read};
use std::process::ExitCode;

use bip39::Mnemonic;
use zcash_keys::keys::UnifiedSpendingKey;
use zcash_protocol::consensus::Network;
use zeroize::Zeroizing;
use zip32::AccountId;

const USAGE: &str = "Usage: derive-viewing-key [--account NUMBER] [--passphrase]\n\
Derives a mainnet Unified Full Viewing Key from a BIP-39 seed phrase.\n\
The phrase is read securely from the terminal, or from standard input when piped.";

struct Options {
    account: u32,
    use_passphrase: bool,
}

fn parse_options() -> Result<Options, String> {
    let mut account = 0;
    let mut use_passphrase = false;
    let mut args = std::env::args().skip(1);

    while let Some(arg) = args.next() {
        match arg.as_str() {
            "--account" => {
                let value = args
                    .next()
                    .ok_or_else(|| "--account requires a number".to_owned())?;
                account = value
                    .parse()
                    .map_err(|_| format!("invalid account number: {value}"))?;
            }
            "--passphrase" => use_passphrase = true,
            "-h" | "--help" => {
                println!("{USAGE}");
                std::process::exit(0);
            }
            _ => return Err(format!("unknown argument: {arg}\n\n{USAGE}")),
        }
    }

    Ok(Options {
        account,
        use_passphrase,
    })
}

fn read_mnemonic() -> Result<Zeroizing<String>, String> {
    if io::stdin().is_terminal() {
        rpassword::prompt_password("Seed phrase (input hidden): ")
            .map(Zeroizing::new)
            .map_err(|error| format!("could not read seed phrase: {error}"))
    } else {
        let mut phrase = Zeroizing::new(String::new());
        io::stdin()
            .read_to_string(&mut phrase)
            .map_err(|error| format!("could not read standard input: {error}"))?;
        Ok(phrase)
    }
}

fn run() -> Result<(), String> {
    let options = parse_options()?;
    let phrase = read_mnemonic()?;
    let mnemonic = Mnemonic::parse(phrase.trim())
        .map_err(|error| format!("invalid BIP-39 seed phrase: {error}"))?;

    let passphrase = if options.use_passphrase {
        Zeroizing::new(
            rpassword::prompt_password("BIP-39 passphrase (input hidden): ")
                .map_err(|error| format!("could not read passphrase: {error}"))?,
        )
    } else {
        Zeroizing::new(String::new())
    };

    let seed = Zeroizing::new(mnemonic.to_seed(passphrase.as_str()));
    let account = AccountId::try_from(options.account)
        .map_err(|_| format!("account must be between 0 and {}", (1_u32 << 31) - 1))?;
    let spending_key = UnifiedSpendingKey::from_seed(&Network::MainNetwork, &*seed, account)
        .map_err(|error| format!("could not derive account key: {error}"))?;
    let viewing_key = spending_key
        .to_unified_full_viewing_key()
        .encode(&Network::MainNetwork);

    // Print only the requested copy/paste value to stdout.
    println!("{viewing_key}");
    Ok(())
}

fn main() -> ExitCode {
    match run() {
        Ok(()) => ExitCode::SUCCESS,
        Err(error) => {
            eprintln!("error: {error}");
            ExitCode::FAILURE
        }
    }
}
