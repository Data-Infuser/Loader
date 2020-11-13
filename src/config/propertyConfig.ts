const propertyJson = require("../../property.json");

const jobqueueRedis_origin = propertyJson['jobqueueRedis'];
const uploadDist_origin = propertyJson['uploadDist'];

const jobqueueRedis = {
    host: process.env.LOADER_JOB_QUEUE_HOST || jobqueueRedis_origin.host,
    port: process.env.LOADER_JOB_QUEUE_PORT || jobqueueRedis_origin.port,
}
const uploadDist = {
    type: process.env.LOADER_UPLOAD_DIST_TYPE || uploadDist_origin.type,
    localPath: process.env.LOADER_UPLOAD_DIST_LOCAL_PATH || uploadDist_origin.localPath,
    awsConfigPath:  process.env.LOADER_UPLOAD_AWS_CONFIG_PATH || uploadDist_origin.awsConfigPath,
    s3Bucket: process.env.LOADER_UPLOAD_S3_BUCKET || uploadDist_origin.s3Bucket
}

const propertyConfigs = {
    jobqueueRedis,
    uploadDist
}

export default propertyConfigs;