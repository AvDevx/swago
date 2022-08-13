#!/usr/bin/env node

import chalk from 'chalk'
import inquirer from 'inquirer'
import { createSpinner } from 'nanospinner'
import clipboard from 'clipboardy'

console.log(chalk.blue(`
  ---------------------------------------
  Golang AWS Deployment Script Generator
  ---------------------------------------
`))

let projectName = ''
let serverPort = ''
let serverDomain = ''
let scriptExport = ''
let serviceName = ''
let certbotContact = ''
let execFileName = ''
let serviceDesc = ''


const sleep = (ms = 1000) => new Promise((r) => setTimeout(r, ms))


async function qCertbotContact() {
  const answers = await inquirer.prompt(
    {
      name: 'certbot_email',
      type: 'input',
      message: 'Enter certbot contact email',
    }
  )
  certbotContact = answers.certbot_email
}

async function qExecFileName() {
  const answers = await inquirer.prompt(
    {
      name: 'exec',
      type: 'input',
      message: 'Enter name for the exec file',
      default() { return 'main' }
    }
  )
  execFileName = answers.exec
}

async function qServiceDesc() {
  const answers = await inquirer.prompt(
    {
      name: 'service_desc',
      type: 'input',
      message: 'Enter service description',
      default() { return serviceName }
    }
  )
  serviceDesc = answers.service_desc
}

async function qServerPort() {
  const answers = await inquirer.prompt(
    {
      name: 'server_port',
      type: 'input',
      message: 'Server running on port?',
      default() { return '8000' }
    }
  )
  serverPort = answers.server_port
}

async function qServerDomain() {
  const answers = await inquirer.prompt(
    {
      name: 'server_name',
      type: 'input',
      message: 'Server name (domain)?',
    }
  )
  serverDomain = answers.server_name
}

async function qScriptExport() {
  const answers = await inquirer.prompt(
    {
      name: 'script_export',
      type: 'list',
      message: 'Where do you want to export the script?',
      choices: [
        'Copy to clipboard',
        'Console log',
      ],
    }
  )
  scriptExport = answers.script_export
}

async function qServiceName() {
  const answers = await inquirer.prompt(
    {
      name: 'service_name',
      type: 'input',
      message: 'What is the service name?'
    }
  )
  serviceName = answers.service_name
}

async function qProjectName() {
  const answers = await inquirer.prompt(
    {
      name: 'project_name',
      type: 'input',
      message: 'What is the project dir name?'
    }
  )
  projectName = answers.project_name
}

async function generateScript() {


// script template
let script = 
`
#!/bin/sh

sudo apt-get update

sudo apt-get install snap -y
sudo snap install --channel=1.17 go --classic

sudo apt-get install nginx -y
sudo ufw allow 'Nginx Full'
sudo ufw allow 'OpenSSH'
yes | sudo ufw enable

echo 'SERVICENAME="${serviceName}"'>> /etc/environment
sudo rm /etc/nginx/sites-available/default

echo 'server {
  # listen on port 80 (http)
  listen ${serverPort};
  server_name ${serverDomain};
  underscores_in_headers on;
  
  location / {
    # redirect any requests to the same URL but on https
    proxy_pass http://localhost:8000;
    proxy_redirect off;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }
}' >> /etc/nginx/sites-available/default


sudo systemctl reload nginx.service
sudo systemctl restart nginx.service

sudo apt-get install python3-certbot-nginx -y
sudo certbot run -n --nginx --agree-tos -d ${serverDomain} -m  ${certbotContact}  --redirect

echo '[Unit]
Description=${serviceDesc}

[Service]
Type=simple
LimitNOFILE=1024
Restart=on-failure
RestartSec=5s
WorkingDirectory=/home/ubuntu/${projectName}
ExecStart=/home/ubuntu/${projectName}/${execFileName}
PermissionsStartOnly=true
StandardOutput=syslog
StandardError=syslog

[Install]
WantedBy=multi-user.target' >> /lib/systemd/system/${serviceName}.service

sudo chmod 755 /lib/systemd/system/${serviceName}.service

sudo apt install ruby-full -y

sudo apt install wget

cd /home/ubuntu

wget https://aws-codedeploy-ap-south-1.s3.ap-south-1.amazonaws.com/latest/install

chmod +x ./install

sudo ./install auto > /tmp/logfile

`
  const spinner = createSpinner('Generating script for you...').start()
  await sleep();

  if (scriptExport === 'Console log') {
    console.log(script)
    spinner.success({ text: 'Script generated successfully!' })
  } else if (scriptExport === 'Copy to clipboard') {
    clipboard.writeSync(script)
    spinner.success({ text: 'Script copied to clipboard successfully!' })
  }
}


// call function for script setup 

await qProjectName()
await qServerPort()
await qServerDomain()

await qServiceName()
await qServiceDesc()

await qExecFileName()
await qCertbotContact()

await qScriptExport()

await generateScript()

