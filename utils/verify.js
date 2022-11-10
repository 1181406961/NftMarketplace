const {run} = require("hardhat")
async function verify(address,argument){
    await run("verify:verify",{
        address:address,
        constructorArguments:argument
    })
}
module.exports = {
    verify
}