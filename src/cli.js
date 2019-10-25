import arg from 'arg';
import inquirer from 'inquirer';
import { prepareDeploy } from './main';

function parseArgumentsIntoOptions(rawArgs) {
 const args = arg(
   {
     '--yes': Boolean,
     '--environment': String,
     '--clientId': String,
     '--accessToken': String,
     '--storeHash': String,
     '--stencilInit': Boolean,
     '--overwriteFiles': Boolean,
     '--inlineOutput': Boolean,
     '--activateTheme': String,
     '-y': '--yes',
     '-p': '--push',
     '-e': '--environment',
     '-c': '--clientId',
     '-t': '--accessToken',
     '-h': '--storeHash',
     '-s': '--stencilInit',
     '-o': '--overwriteFiles',
     '-a': '--activateTheme',
     '-i': '--inlineOutput'
   },
   {
     argv: rawArgs.slice(2),
   }
 );
 return {
   skipPrompts: args['--yes'] || false,
   environment: args['--environment'] || false,
   clientId: args['--clientId'] || false,
   accessToken: args['--accessToken'] || false,
   storeHash: args['--storeHash'] || false,
   stencilInit: args['--stencilInit'] || false,
   overwriteFiles: args['--overwriteFiles'] || false,
   activateTheme: args['--activateTheme'] || false,
   runInstall: args['--install'] || false,
   inlineOutput: args['--inlineOutput'] || false,
 };
}
async function promptForMissingOptions(options) {
  const defaultEnvironment = 'Staging';
  const defaultClientId = process.env.CLIENT_ID;
  const defaultAccessToken =  process.env.ACCESS_TOKEN;
  const defaultStoreHash = process.env.STORE_HASH;

  if (options.skipPrompts) {
    return {
      ...options,
      environment: options.environment || defaultEnvironment,
      clientId: options.clientId || defaultClientId,
      accessToken: options.accessToken || defaultAccessToken,
      storeHash: options.storeHash || defaultStoreHash,
    };
  }
 
  const questions = [];
 
  if (!options.environment) {
    questions.push({
      type: 'list',
      name: 'environment',
      message: 'Target environment?',
      choices: ['Staging', 'Production'],
      default: defaultEnvironment,
    });
  }
  
  if (!options.clientId) {
    questions.push({
      type: 'password',
      name: 'clientId',
      message: 'BigCommerce Client ID?',
      default: defaultClientId,
    });
  }

  if (!options.accessToken) {
    questions.push({
      type: 'password',
      name: 'accessToken',
      message: 'BigCommerce Access Token?',
      default: defaultAccessToken,
    });
  }

  if (options.stencilInit && !options.storeUrl) {
    questions.push({
      type: 'input',
      name: 'storeUrl',
      message: 'BigCommerce Store URL?',
      default: defaultStoreUrl,
    });
  }
  
  if (!options.storeHash) {
    questions.push({
      type: 'input',
      name: 'storeHash',
      message: 'BigCommerce Store Hash?',
      default: defaultStoreHash,
    });
  }

 
  const answers = await inquirer.prompt(questions);
  return {
    ...options,
    environment: options.environment || answers.environment,
    clientId: options.clientId || answers.clientId,
    accessToken: options.accessToken || answers.accessToken,
    storeUrl: options.storeUrl || answers.storeUrl,
    storeHash: options.storeHash || answers.storeHash,
  };
 }

export async function cli(args) {
  let options = parseArgumentsIntoOptions(args);
  options = await promptForMissingOptions(options);
  await prepareDeploy(options);
 }