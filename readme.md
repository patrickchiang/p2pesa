# P2Pesa

P2Pesa is a proof-of-concept centralized currency transfer system (CCTS) that allows entities with physical branches to run a M-PESA-like service without having control of any telecommunications infrastructure, using Twilio's SMS system to handle transactions instead.

## Requirements

* NodeJS
* MySQL database
* Twilio account

## Installation

1. Create a MySQL database and user for P2Pesa.
2. Run `npm install` on the p2pesa directory.
3. Rename `config_example.js` as `config.js` and fill out the variables.
4. Run `node server.js` to start the server on port 3000.
5. Browse to [http://localhost:3000/init](http://localhost:3000/init). **This creates and resets the database schema, and wipes all data currently in it.** You may also want to edit server.js, specifically the /init handler to change the default password of the Central branch, or the default branches and their passwords.

## Usage

After installation, run `node production.js` to start the server on port 80. Make sure that nothing else is running on port 80.

P2Pesa assumes that there are three levels of users of the system: central control, local branches, and end users.

### Central control

Central control has the highest privilege level of the hierarchy. They also have an infinite supply of virtual money, which they can sell for physical cash.

Central control logs in with the same interface as all other branches. The default username is `Central` and the default password is `secure`.

Central control can add money to branches, or create other branches.

### Local branches

Local branches are considered semi-trusted users of the system. They can check the branch balance, create users, withdraw money from user accounts (with their permission), and transfer money from their branch account to user accounts.

Local branches are identified by their names and a secured password. They are usually created by the central control.

### End users

End users can check their balance and transfer money to other end users in the system. There is a 2-step-authentication process that they login with.

End users are identified by their phone numbers and secret pins. Their accounts are created by local branches, or automatically when other end users send them money via SMS (default password: `secure`).

End users can withdraw money at local branches (turn virtual money into physical), where the system will send them a 5 digit code via SMS that they will have to provide their local branch to authorize the transaction.

### Sending money via SMS

End users can send money to other end users via SMS by texting the system phone number a message with the format `Send $amount to +phonenumber`. For example `Send $100 to +12345678901` will send $100 to the user with the phone number +1 (234) 567-8901.

End users can also send money to people who don't have a P2Pesa account. In that case, the receiver will get an SMS informing them that they have received money, and they can withdraw that money from a local branch with the same process as anyone else with an account.

### Transaction Failure

Transactions can fail if:

1. The amount entered is an invalid symbol, or is formatted incorrectly. Dollar signs are not to be included in the amount textbox.
2. The receiver phone number is formatted incorrectly.
3. The amount to withdraw from the sender account exceeds the amount they have in their account.
4. The receiver is not of the correct account type. End users cannot send money to branches or central. Branches cannot withdraw money from other branches. Etc.

## Demo

A running example can be found at [http://pchiang.me:3000](http://pchiang.me:3000).

## Author

Patrick Chiang (pchiang@uw.edu)

## License

If you are using this for an education or demonstrative purpose, you can probably do whatever you want as long as you attribute me. If you found a way to make money off of this, contact me so I can demand a cut of your profits.