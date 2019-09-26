import chalk from 'chalk';
import fs from 'fs';
import ncp from 'ncp';
import path from 'path';
import { promisify } from 'util';
import execa from 'execa';
import Listr from 'listr';
import { projectInstall } from 'pkg-install';
const axios = require('axios');
const _ = require('lodash');
const util = require('util');
const log = console.log;

let bcAxios;
let bcBaseUrl;


// const access = promisify(fs.access);
// const copy = promisify(ncp);

// async function copyTemplateFiles(options) {
//  return copy(options.templateDirectory, options.targetDirectory, {
//    clobber: false,
//  });
// }

// async function initGit(options) {
//   const result = await execa('git', ['init'], {
//     cwd: options.targetDirectory,
//   });
//   if (result.failed) {
//     return Promise.reject(new Error('Failed to initialize git'));
//   }
//   return;
//  }

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
    return chalk.yellow(`Removed ${theme.name}`);
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
          return '.stencil exists - pass --overwriteFiles to allow';
        }
      },
    },
    // {
    //   title: 'Install dependencies',
    //   task: () =>
    //     projectInstall({
    //       cwd: options.targetDirectory,
    //     }),
    //   skip: () =>
    //     !options.runInstall
    //       ? 'Pass --install to automatically install dependencies'
    //       : undefined,
    // },
  ]);

// export async function createProject(options) {
//  options = {
//    ...options,
//    targetDirectory: options.targetDirectory || process.cwd(),
//  };

//  const currentFileUrl = import.meta.url;
//  const templateDir = path.resolve(
//    new URL(currentFileUrl).pathname,
//    '../../templates',
//    options.template.toLowerCase()
//  );
//  options.templateDirectory = templateDir;

//  try {
//    await access(templateDir, fs.constants.R_OK);
//  } catch (err) {
//    console.error('%s Invalid template name', chalk.red.bold('ERROR'));
//    process.exit(1);
//  }

//  const tasks = new Listr([
//   {
//     title: 'Remove oldest theme',
//     task: () => removeOldestTheme(options),
//   },
//   {
//     title: 'Create stencil config',
//     task: () => initStencil(options),
//     enabled: () => options.stencil,
//   },
//   {
//     title: 'Install dependencies',
//     task: () =>
//       projectInstall({
//         cwd: options.targetDirectory,
//       }),
//     skip: () =>
//       !options.runInstall
//         ? 'Pass --install to automatically install dependencies'
//         : undefined,
//   },
// ]);

 await tasks.run();

 console.log('%s Project ready', chalk.green.bold('DONE'));
 return true;
}