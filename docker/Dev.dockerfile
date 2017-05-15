FROM node:6.3.1-wheezy

WORKDIR /package

ADD package.json /package/package.json
RUN npm install

# Add node_modules/.bin to PATH
ENV PATH "/package/node_modules/.bin:${PATH}"
