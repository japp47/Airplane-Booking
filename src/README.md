This is a base node js project template which anyone can used, by keeping some of the most important code principles and project management recommendations.

`src` -> Inside the src folder all the actual source will reside, will not include any kkind of tests.

Lets take a look inside the `src` folder:

 - `config` -> In this folder anything and everything regarding any configurations setup of a library or module will be done. For example: setting up `dotenv` so that we can use the environmental variables anywhere in sa cleaner fashion, this is done in the `server-config.js`. One more example can be setup you logging library that can help you to prepare meaningful logs, so configurations for this library should also be done here.

 - `routes` -> In the routes folder, we register a route and the corresponding middleware and controllers to it.

 - `middlewares` -> they are just going to intercept the incoming requests where we can write our validators, authenticators, etc.

 