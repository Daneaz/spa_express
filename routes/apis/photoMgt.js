var express = require('express');
var router = express.Router();
const storage = require('azure-storage');
const path = require('path');
var fs = require('fs');

const accountName = 'projectspa';
const accountKey = 'R7zA1Mtsis7edYRfOEwu8Sv4gmA51Cz3bx13N5GH83ixS/XI/IPr/yO0Ku8btTp6tvYghS6rzPEFMGJfFoUYjg==';
const containerName = 'spacontainer';
const blobService = storage.createBlobService(accountName, accountKey);

const listContainers = async () => {
    return new Promise((resolve, reject) => {
        blobService.listContainersSegmented(null, (err, data) => {
            if (err) {
                reject(err);
            } else {
                resolve({ message: `${data.entries.length} containers`, containers: data.entries });
            }
        });
    });
};

const createContainer = async (containerName) => {
    return new Promise((resolve, reject) => {
        blobService.createContainerIfNotExists(containerName, { publicAccessLevel: 'blob' }, err => {
            if (err) {
                reject(err);
            } else {
                resolve({ message: `Container '${containerName}' created` });
            }
        });
    });
};

const uploadString = async (containerName, blobName, text) => {
    return new Promise((resolve, reject) => {
        blobService.createBlockBlobFromText(containerName, blobName, text, err => {
            if (err) {
                reject(err);
            } else {
                resolve({ message: `Text "${text}" is written to blob storage` });
            }
        });
    });
};

const uploadLocalFile = async (containerName, filePath) => {
    return new Promise((resolve, reject) => {
        const fullPath = path.resolve(filePath);
        const blobName = path.basename(filePath);
        blobService.createBlockBlobFromLocalFile(containerName, blobName, fullPath, err => {
            if (err) {
                reject(err);
            } else {
                resolve({ message: `Local file "${filePath}" is uploaded` });
            }
        });
    });
};

const listBlobs = async (containerName) => {
    return new Promise((resolve, reject) => {
        blobService.listBlobsSegmented(containerName, null, (err, data) => {
            if (err) {
                reject(err);
            } else {
                resolve({ message: `${data.entries.length} blobs in '${containerName}'`, blobs: data.entries });
            }
        });
    });
};

const downloadBlob = async (containerName, blobName) => {
    const dowloadFilePath = path.resolve('./' + blobName.replace('.jpg', '.downloaded.jpg'));
    return new Promise((resolve, reject) => {
        blobService.getBlobToLocalFile(containerName, blobName, blobName, (err, data) => {
            if (err) {
                reject(err);
            } else {
                resolve({ message: `Blob downloaded "${data}"`, text: data });
            }
        });
    });
};

const deleteBlob = async (containerName, blobName) => {
    return new Promise((resolve, reject) => {
        blobService.deleteBlobIfExists(containerName, blobName, err => {
            if (err) {
                reject(err);
            } else {
                resolve({ message: `Block blob '${blobName}' deleted` });
            }
        });
    });
};

const deleteContainer = async (containerName) => {
    return new Promise((resolve, reject) => {
        blobService.deleteContainer(containerName, err => {
            if (err) {
                reject(err);
            } else {
                resolve({ message: `Container '${containerName}' deleted` });
            }
        });
    });
};

const execute = async () => {

    // const localFilePath = "public/photos/auth.png";
    // let response;

    // console.log("Containers:");
    // response = await listContainers();
    // response.containers.forEach((container) => console.log(` -  ${container.name}`));

    // const containerDoesNotExist = response.containers.findIndex((container) => container.name === containerName) === -1;

    // if (containerDoesNotExist) {
    //     await createContainer(containerName);
    //     console.log(`Container "${containerName}" is created`);
    // }

    // response = await uploadLocalFile(containerName, localFilePath);
    // console.log(response.message);

    console.log(`Blobs in "${containerName}" container:`);
    response = await listBlobs(containerName);
    response.blobs.forEach((blob) => console.log(` - ${blob.name}`));

    // response = await downloadBlob(containerName, 'auth.png');
    // console.log(`Downloaded blob content: ${response.text}"`);

    // await deleteBlob(containerName, blobName);
    // console.log(`Blob "${blobName}" is deleted`);

    // await deleteContainer(containerName);
    // console.log(`Container "${containerName}" is deleted`);

}

execute().then(() => console.log("Done")).catch((e) => console.log(e));

/* Save photo over Kiosk POST Create client . */
router.post('/savephoto', async (req, res, next) => {
    try {
        let dataObj = req.body;

        if (!dataObj.imagebase64) return res.sendStatus(400);
        // if (!dataObj.id) return res.sendStatus(400);

        var id = dataObj.id;
        var imageBase64s = dataObj.imagebase64.split(",");
        var fileType = "jpg";
        if (imageBase64s[0].includes("png")) { fileType = "png" }
        var imgData = imageBase64s[1];

        //console.log("imagebase64", imagebase64,firstname, lastname, filetype);

        var save_filename = path.resolve(__dirname, `../../public/photos/${id}.${fileType}`);
        save_filename = `public/photos/${id}.${fileType}`
        fs.writeFile(save_filename, imgData, { encoding: 'base64' }, function (err) {
            if (err) throw err;
            console.log('File created');
            uploadLocalFile(containerName, save_filename).then(response=>{
                console.log(response.message);
                console.log(`Blobs in "${containerName}" container:`);
                res.json({ ok: 'success', path: save_filename });
            });
            
        });

    } catch (err) { res.status(400).json({ error: `Cannot save photo, ${err.message}` }) }

});

module.exports = router;