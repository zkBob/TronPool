const TronWeb = require('tronweb');


module.exports = async function(deployer) {
    const tronWeb = new TronWeb({
        fullNode: 'https://api.shasta.trongrid.io',
        solidityNode: 'https://api.shasta.trongrid.io',
    }, deployer.options.options.privateKey);
    const params = [
        {type: 'uint8', value: '0'}, // tier
        {type: 'uint256', value: '144115188075855871'}, // zkBobPoolCap
        {type: 'uint256', value: '8589934591'}, // zkBobDailyDepositCap
        {type: 'uint256', value: '8589934591'}, // zkBobDailyWithdrawalCap
        {type: 'uint256', value: '8589934591'}, // zkBobDailyUserDepositCap
        {type: 'uint256', value: '8589934591'}, // zkBobDepositCap
        {type: 'uint256', value: '100000000'}, // zkBobDailyUserDirectDepositCap
        {type: 'uint256', value: '100000000'}, // zkBobDirectDepositCap
    ];
    var transaction = await tronWeb.transactionBuilder.triggerSmartContract(
        'TLTyi81NhoeGfsq8Ef1STDYs6E7HFSAruV',
        'setLimits(uint8,uint256,uint256,uint256,uint256,uint256,uint256,uint256)',
        {},
        params,
    );
    var signed = await tronWeb.trx.sign(
        transaction.transaction,
        deployer.options.options.privateKey,
    );
    var result = await tronWeb.trx.sendRawTransaction(signed);
};