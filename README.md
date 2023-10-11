# TronPool
Here is the code for compiling and deploying ZkPool on tron.
## Deployment
The deployment is done via the `tronbox` - it is a truffle fork.
The deployment code can be seen in `migrations` folder.
You can deploy `ZkBobPoolErc20` by running migrations.
```
Fill the PRIVATE_KEY and TOKEN in .env depending of the network you are deploying to
source .env && tronbox migrate --network <network> --to 2
Fill the POOL_IMPL and QUEUE_PROXY in .env
source .env && tronbox migrate --network <network> -f 3 --to 3
Fill the POOL in .env
source .env && tronbox migrate --network <network> -f 4 --to 4 ## only if you need tokenSeller
```

There are other constants in the `.env` file, all of them are similar to the original `ZkBobPool`.
If you need other configuration, you can look directly in `migrations` file.
