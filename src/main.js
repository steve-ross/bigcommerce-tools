import chalk from 'chalk';
import fs from 'fs';
import execa from 'execa';
import Listr from 'listr';
const axios = require('axios');
const _ = require('lodash');


const STENCIL_CONFIG_FILE = 'config.stencil.json';
const STENCIL_SECRETS_FILE = 'secrets.stencil.json';

let bcAxios;
let bcBaseUrl;

function initAxios(options){
  if (!bcAxios){

    bcAxios = axios.create({
      headers: {
        'X-Auth-Token': options.accessToken,
        'X-Auth-Client': options.clientId,
      },
    });
  }
  if (!bcBaseUrl) bcBaseUrl = `https://api.bigcommerce.com/stores/${options.storeHash}`;
}

async function pushAndActivateTheme(options){
  try {
    await execa('npx', ['-p', '@bigcommerce/stencil-cli', 'stencil','push','-a', options.activateTheme], {
      cwd: options.targetDirectory,
    });
    
  } catch (error) {
    throw new Error(`Push and Activate Theme failed with ${error.message}`);
    
  }
}

async function getStoreInfo(){
  try {
    const themeResp = await bcAxios.get(`${bcBaseUrl}/v2/store`);
    return themeResp.status === 200 && themeResp.data;
  } catch (error) {
    throw new Error(`Fetching store info from BigCommerce failed with:  ${error.message}`);
  }
}

async function getThemes(){
  try {
    const themeResp = await bcAxios.get(`${bcBaseUrl}/v3/themes`);
    return themeResp.status === 200 && themeResp.data.data;
  } catch (error) {
    throw new Error(`Fetching themes from BigCommerce failed with: ${error.message}`);
  }
}


async function skipThemeCleanup() {
    const themes = await getThemes();
    if(!_.find(themes, {is_active: false, is_private: true})){
      return 'Nothing to clean up.';
    }
}

async function cleanupThemes(options) {
  try {
      const themes = await getThemes(options);
      const theme = _.find(themes, {is_active: false, is_private: true});
      if(theme){
        await bcAxios.delete(`${bcBaseUrl}/v3/themes/${theme.uuid}`);
        return `Removed Theme: ${theme && theme.name}`;
      } else {
        return `no themes to cleanup`;
      }
  } catch (error) {
    throw new Error(`Cleanup Themes Failed with: ${error.message}`);
  }
}

async function initStencil(options) {
  const storeInfo = await getStoreInfo(options);
  const stencilConfig = {
    'customLayouts': {
      'brand': {},
      'category': {},
      'page': {},
      'product': {},
    },
    'normalStoreUrl': 'https://' + storeInfo.domain,
    'port': 3000,
  }
  const stencilSecrets = {
    accessToken: options.accessToken,
  }
  await fs.writeFileSync(`${options.targetDirectory}/${STENCIL_CONFIG_FILE}`, JSON.stringify(stencilConfig));
  await fs.writeFileSync(`${options.targetDirectory}/${STENCIL_SECRETS_FILE}`, JSON.stringify(stencilSecrets));
}

export async function prepareDeploy(options) {
  options = {
    ...options,
    targetDirectory: options.targetDirectory || process.cwd(),
  };

  initAxios(options);
  const tasks = new Listr([
    {
      title: 'Cleanup outdated private themes',
      task: () => cleanupThemes(options),
      skip: () => skipThemeCleanup(options),
    },
    {
      title: `Stencil config files`,
      task: () => initStencil(options),
      enabled: () => options.stencilInit,
      skip: () => {
        if(fs.existsSync(`${options.targetDirectory}/${STENCIL_CONFIG_FILE}`) || fs.existsSync(`${options.targetDirectory}/${STENCIL_SECRETS_FILE}`) && !options.overwriteFiles){
          return 'using existing config file --overwriteFiles to replace';
        }
      },
    },
    {
      title: 'Push and Activate Theme',
      task: () => pushAndActivateTheme(options),
      skip: () =>
        !options.activateTheme
          ? 'Pass --activateTheme SomeThemeName to push and activate the theme w/stencil'
          : undefined,
    },
  ], {renderer: options.inlineOutput ? 'verbose' : 'default'});

  return await tasks.run();

}