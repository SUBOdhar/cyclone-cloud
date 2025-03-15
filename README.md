# Cyclone Cloud Documentation

**Cyclone Cloud** is an open-source cloud storage solution built using JavaScript frameworks, Node.js, and React.js. It is currently supported for Windows, with an alternative build method for Linux-based systems.

## Table of Contents

- [Clone the Repository](#clone-the-repository)
- [Windows Installation](#for-windows)
- [Linux Installation](#for-linux)
- [Docker Installation](#for-docker)
- [Contribution](#contribution)

## Clone the Repository

To get started, clone the Cyclone Cloud repository using the following command:
> [!TIP]
> Always Clone the repo outside of onedrives directory.
```shell
git clone https://github.com/SUBOdhar/cyclone-cloud.git
```

Navigate to the project directory:

```shell
cd cyclone-cloud
```

## For Windows

For Windows users, you can use the provided batch script to run the server.

1. Execute the following command in the command prompt:

   ```shell
   runner.bat
   ```

2. This will build the necessary dependencies and start the server.

3. Once the build is complete, open your browser and navigate to:

   ```
   http://localhost:3001
   ```

## For Linux

For Linux-based systems, follow these steps to build and run the server:

1. Install the necessary dependencies for the frontend:

   ```shell
   npm i
   npm run build
   ```

2. Move the built frontend files to the server directory:

   ```shell
   cd ..
   mv /cyclone_web/dist /server/
   ```

3. Navigate to the server directory and install the backend dependencies:

   ```shell
   cd server
   npm i
   ```

4. Finally, start the server:

   ```shell
   node index.js
   ```

5. Open your browser and go to:

    ```
    http://localhost:3001
    ```
## For Docker 
### Run 
```
docker run -d -p 3001:3001 subodh0011a/cyclonecloud:latest
 ```
