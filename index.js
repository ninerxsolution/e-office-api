process.env.TZ = 'Asia/Bangkok';

const express = require('express');
const line = require('@line/bot-sdk');
const fetch = require('node-fetch');

const config = {
    channelAccessToken: '', // Channel access token จาก Line developers Messaging api
    channelSecret: '' //Channel secret จาก Line developers Messaging api Basic settings
};

const db = require('./db.js');
const { Profile, Line_UID } = db;
const app = express();

db.sequelize.sync();
db.syncLineUid();

app.post('/webhook', line.middleware(config), (req, res) => {
    Promise
        .all(req.body.events.map(handleEvent))
        .then((result) => {
            res.json(result);
        })
        .catch((error) => {
            console.error('Error handling events:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        });
});

app.get('/get-line-uid', async (req, res) => {
    try {
        const lineUidData = await db.getLineUid();
        const uids = lineUidData.map(entry => entry.uid);
        res.json(uids);
        console.log('List uid :', uids);
    } catch (error) {
        console.error('Error getting Line_UID data:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

function createReferenceKey(mainKey) {
    let referenceKey = '';

    for (let i = 0; i < 5; i++) {
        const randomIndex = Math.floor(Math.random() * mainKey.length);
        referenceKey += mainKey.charAt(randomIndex);
    }

    return referenceKey;
}

async function fetchProfile(userId) {
    try {
        let resp = await fetch('https://api.line.me/v2/bot/profile/' + userId, {
            headers: {
                Authorization: 'Bearer ' + config.channelAccessToken
            },
            method: "GET"
        });

        let j = await resp.json();
        // console.log(j);
        return j;
    }
    catch (err) {
        return null;
    }
}

async function replyProfile(event, newRef) {
    try {
        let resp = await fetch('https://api.line.me/v2/bot/message/reply', {
            headers: {
                "Content-Type": "application/json",
                Authorization: 'Bearer ' + config.channelAccessToken
            },
            method: "POST",
            body: JSON.stringify({
                replyToken: event.replyToken,
                messages: [{
                    type: 'text',
                    text: 'ID ยืนยันตัวตนของคุณคือ : ' + newRef
                }]
            })
        });

        let j = await resp.json();
        // console.log(j);
        return j;
    } catch (err) {
        console.error('Error in replyProfile:', err);
        return null;
    }
}

async function replyProfileUnblock(event) {
    try {
        let resp = await fetch('https://api.line.me/v2/bot/message/reply', {
            headers: {
                "Content-Type": "application/json",
                Authorization: 'Bearer ' + config.channelAccessToken
            },
            method: "POST",
            body: JSON.stringify({
                replyToken: event.replyToken,
                messages: [{
                    type: 'text',
                    text: 'Line official ยินดีต้อนรับกลับ บัญชีนี้ได้รับการยืนยันตัวตนอยู่แล้ว สามารถใช้งานต่อได้เลย'
                }]
            })
        });

        let j = await resp.json();
        // console.log(j);
        return j;
    } catch (err) {
        console.error('Error in replyProfile:', err);
        return null;
    }
}

async function replyMessege(event) {
    try {
        let resp = await fetch('https://api.line.me/v2/bot/message/reply', {
            headers: {
                "Content-Type": "application/json",
                Authorization: 'Bearer ' + config.channelAccessToken
            },
            method: "POST",
            body: JSON.stringify({
                replyToken: event.replyToken,
                messages: [{
                    type: 'text',
                    text: 'ขออภัยในความไม่สะดวก Line Bot Official ไม่ได้ถูกออกแบบมาเพื่อให้ผู้ใช้ส่งข้อความ'
                }]
            })
        });

        let j = await resp.json();
        // console.log(j);
        return j;
    } catch (err) {
        console.error('Error in replyProfile:', err);
        return null;
    }
}

async function handleEvent(event) {
    const userId = event.source.userId;
    let fetchProfilData = await fetchProfile(userId);

    console.log(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
    console.log('Event type:', event.type);

    try {
        const profiles = await db.getProfiles();
        const line_uid = await db.getLineUid();
        // console.log('All Profiles:', profiles);
        // console.log('All Line_UID:', line_uid);
    } catch (error) {
        console.error('Error getting profiles:', error);
    }
    console.log('User :', userId);
    if (fetchProfilData.displayName) {
        console.log('Name :', fetchProfilData.displayName);
        console.log('Picture URL :', fetchProfilData.pictureUrl);
    }
    switch (event.type) {
        case 'message':
            if (event.message && event.message.type === 'text') {
                console.log('Try to send message.');
                console.log('that message :', event.message.text);
                replyMessege(event);
            } else {
                console.log('Just do something.');
            }
            break;

        case 'postback':
            console.log('Just Post back.');
            break;

        case 'follow':
            // Handle follow event
            const existingLineUid = await Line_UID.findOne({ where: { uid: userId } });
            if (!existingLineUid) {
                const displayName = '';
                const newRef = createReferenceKey(userId);
                const existingNewRef = await Line_UID.findOne({ where: { ref_key: newRef } });
                let fetchProfilData = await fetchProfile(userId);
                if (!existingNewRef) {
                    await Line_UID.create({ uid: userId, display_name: fetchProfilData.displayName, ref_key: newRef });
                    await replyProfile(event, newRef);
                    console.log('Reference key :', newRef)
                    console.log('Just follow.');
                } else {
                    handleEvent(event);
                    console.log('Reference key create failed. And recreating');
                }

            } else {
                await Line_UID.update({ uid: userId }, { where: { uid: userId } });
                await Profile.update({ isActive: true }, { where: { line_uid: userId } });
                await replyProfileUnblock(event);
                console.log(`UID ${userId} already exists in the Line_UID table. Skipping creation.`);
            }
            break;

        case 'unfollow':
            // Handle unfollow event
            await Profile.update({ isActive: false }, { where: { line_uid: userId } });
            console.log('Just unfollow.');
            break;

        default:
            // Handle other event types
            console.log('Event not matched.');
    }
    console.log('');
}

const port = 3005;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

