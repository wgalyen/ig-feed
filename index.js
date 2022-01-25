const axios = require('axios');
const fs = require('fs');
const fsPromises = fs.promises;

const handleError = (error) => {
    if (error.response) {
        const {
            data: {
                error: { message },
            },
            status,
        } = error.response;

        return `${error.message}: ${message}`;
    }

    return error.message;
};

module.exports.error = (message) => {
    console.error(message);
    process.exit(1);
};

const getRecentMedia = async () => {
    try {
        const accessToken = process.env.IG_ACCESS_TOKEN;

        if (!accessToken) {
            throw new Error('Missing required environment variable "IG_ACCESS_TOKEN."');
        }

        const {
            data: {
                data: recentMedia
            }
        } = await axios.get('https://graph.instagram.com/me/media', {
            params: {
                access_token: accessToken,
                fields: 'media_url,media_type,permalink'
            }
        });

        await fsPromises.writeFile('media.json', JSON.stringify(recentMedia));
    } catch (err) {
        module.exports.error(handleError(err));
    }
};

if (process.env.NODE_ENV !== 'test') {
    getRecentMedia();
}

module.exports.getRecentMedia = getRecentMedia;