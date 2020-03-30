import chalk from 'chalk';
import fs from 'fs';
import execa from 'execa';
import Listr from 'listr';
const axios = require('axios');
const _ = require('lodash');

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
    const result = await execa('npx', ['-p', '@bigcommerce/stencil-cli', 'stencil','push','-a', options.activateTheme], {
      cwd: options.targetDirectory,
    });
    return "pushed and activated";
  } catch (error) {
    return new Error("Something failed in the push!");
  }
}

async function getStoreInfo(options){
  const themeResp = await bcAxios.get(`${bcBaseUrl}/v2/store`);
  return themeResp.status === 200 && themeResp.data;
}

async function getThemes(options){
  const themeResp = await bcAxios.get(`${bcBaseUrl}/v3/themes`);
  return themeResp.status === 200 && themeResp.data.data;
}


async function skipThemeCleanup(options) {
  const themes = await getThemes(options);
  if(!_.find(themes, {is_active: false, is_private: true})){
    return "Nothing to clean up.";
  }
}

async function cleanupThemes(options) {
  const themes = await getThemes(options);
  const theme = _.find(themes, {is_active: false, is_private: true})
  if (theme !== undefined){
    await bcAxios.delete(`${bcBaseUrl}/v3/themes/${theme.uuid}`);
    setTimeout(() => {
      return chalk.yellow(`Removed ${theme.name}`);
    }, 2000);
  }
}

async function initStencil(options) {
  const storeInfo = await getStoreInfo(options);
  const stencilFileData = {
    normalStoreUrl: storeInfo.domain,
    accessToken: options.accessToken,
    port: 3000,
    customLayouts: {
      brand: {},
      category: {},
      page: {},
      product: {}
    }
  }
  await fs.writeFileSync(`${options.targetDirectory}/.stencil`, JSON.stringify(stencilFileData));
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
      title: 'Stencil config file (.stencil)',
      task: () => initStencil(options),
      enabled: () => options.stencilInit,
      skip: () => {
        if(fs.existsSync(`${options.targetDirectory}/.stencil`) && !options.overwriteFiles){
          return 'using existing .stencil file --overwriteFiles to replace';
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

 await tasks.run();

 console.log('%s Deployed!', chalk.green.bold('DONE'));
 return true;
}