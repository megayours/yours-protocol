# ERC721

The `erc721` module is a module that allows you to receive and manage ERC721 tokens. It is intended to be used together with an external blockchain that emits events.

## Integrating tokens

Integrating tokens is as easy as extending your `chromia.yml` file with the following:

```yaml
example_dapp2:
module: examples.dapp2
config:
  gtx:
    modules:
      - 'net.postchain.d1.icmf.IcmfReceiverGTXModule'
  icmf:
  receiver:
      local:
      - bc-rid: null
          topic: 'L_yours_erc721_<chain>_<contract_address_without_0x_prefix_in_lower_case>'
```

Example chains are:
- `ethereum`
- `bsc`
- `bscTestnet`
- `polygon`
- `amoy`

Example contracts are:
- `524cab2ec69124574082676e6f654a18df49a048`

Make sure to import the `erc721` module in your entrypoint.

```
import modules.erc721;
```

## Attaching your own code to the tokens

The easiest way to attach your own code to the tokens is to use the `receive_properties` extendable function and check for the `erc721` module name.

```kotlin
@extend(yours.receive_properties)
function (yours.token, module_name: name, properties: map<text, gtv>) {
  if (module_name == erc721.MODULE_NAME) {
    // Do something with the properties
  }
}
```