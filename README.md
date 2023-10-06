# TronPool
Here is the code for compiling and deploying ZkPool on tron.
## Deployment
The deployment is done via the `tronbox` - it is a truffle fork.
The deployment code can be seen in `migrations` folder.
You can deploy `ZkBobPoolErc20` by running migrations.
```
Fill the PRIVATE_KEY_NILE/PRIVATE_KEY_SHASTA/PRIVATE_KEY in .env depending of the network you are deploying to
source .env && tronbox migrate --network <network> --to 2
Fill the POOL_IMPL and QUEUE_PROXY in .env
source .env && tronbox migrate --network <network> -f 3 --to 4
```
