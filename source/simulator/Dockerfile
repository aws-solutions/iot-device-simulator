FROM node:8.1

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY ./helpers/usage-metrics/ ./helpers/usage-metrics/
COPY package*.json ./

RUN npm install --only=production --silent
# If you are building your code for production
# RUN npm install --only=production

# Bundle app source
COPY . .

CMD [ "npm", "start" ]
