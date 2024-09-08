# Yours Protocol

![Integration Tests](https://github.com/megayours/yours-protocol/actions/workflows/integration-tests.yml/badge.svg)

Yours Protocol is a groundbreaking token standard built on Chromia's relational blockchain, enabling dynamic on-chain metadata and promoting composability and interoperability.

## 🌟 Key Features

- **Dynamic On-Chain Metadata**: Evolve token attributes over time, moving beyond static off-chain metadata.
- **Versatile Token Support**: Accommodate both semi-fungible and non-fungible tokens.
- **Interoperable Schema**: Standardized schema for cross-blockchain token and metadata transfers.
- **Performance-Oriented Design**: Optimized data storage for enhanced efficiency and ease-of-use.

## 📚 Documentation

For comprehensive information about Yours Protocol, please visit our [official documentation](https://docs.megayours.com/yours-protocol).

### 🚀 Getting Started

New to Yours Protocol? Our [Getting Started guide](https://docs.megayours.com/yours-protocol/getting-started) will help you with everything that you need to get going.

### 🧩 Core Concepts

- [Tokens](https://docs.megayours.com/yours-protocol/tokens)
- [Modules](https://docs.megayours.com/yours-protocol/modules)
- [Metadata](https://docs.megayours.com/yours-protocol/metadata)
- [Interoperability](https://docs.megayours.com/yours-protocol/interoperability)

## 💻 Installation

```yaml
libs:
  ft4:
    registry: https://gitlab.com/chromaway/ft4-lib.git
    path: rell/src/lib/ft4
    tagOrBranch: v1.0.0r
    rid: x"FA487D75E63B6B58381F8D71E0700E69BEDEAD3A57D1E6C1A9ABB149FAC9E65F"
    insecure: false
  iccf:
    registry: https://gitlab.com/chromaway/core/directory-chain
    path: src/iccf
    tagOrBranch: 1.32.2
    rid: x"1D567580C717B91D2F188A4D786DB1D41501086B155A68303661D25364314A4D"
    insecure: false
  yours:
    registry: ---
    path: src/lib/yours
    tagOrBranch: ---
    rid: x"---"
    insecure: false
```

After adding these to your `chromia.yml` file, run `chr install` to pull in the dependencies.

## 🤝 Contributing

We welcome contributions from the community! If you're interested in helping improve Yours Protocol, please check out our [Contributing Guide](https://docs.megayours.com/contributing) for more information on how to get started.
