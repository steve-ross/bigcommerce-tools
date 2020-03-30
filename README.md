# Stencil Preflight Tools 
### Scripts to handle interacting with BigCommerce for CI / CD (Or just to make life easier)

It's nearly impossible to do continuous delivery to mulitple environments with the [@bigcommerce/stencil-cli](https://github.com/bigcommerce/stencil-cli) - you'll run into "too many themes" errors, have to put your '.stencil' config file in your repo (unsafe) or accidentally deploy to the wrong environment. This script will let you avoid those issues so you can continuously deliver a theme to different environments.

![image](https://user-images.githubusercontent.com/297351/65704136-fa6f0d00-e053-11e9-9920-410e49ea7bf3.png)

## Continuous Delivery Guide (we use codeship.com)

1. install: `npm i -g @steve-ross/bigcommerce-tools`
2. clone your repo (and cd into your theme directory if needed)
3. install theme packages: `npm i`
4. DEPLOY: `stencil-preflight -y -i --stencilInit --activateTheme "YOUR THEME NAME (in config.json)" --accessToken your_access_token --clientId your_client_id --storeHash your_store_hash`


## In Action!

![2019-09-26 11 43 58](https://user-images.githubusercontent.com/297351/65704254-2f7b5f80-e054-11e9-9199-5e69ad577aa2.gif)


### Contributing
 1. Clone the repo
 2. `npm i`
 3. `npm link`
 4. open a PR!
