'use strict';

const express = require('express');
const { connect } = require('../database/conn.js');
const { ObjectId } = require('mongodb');
const router = express.Router();

// const profiles = [
//     {
//         id: 1,
//         name: 'A Martinez',
//         description: 'Adolph Larrue Martinez III.',
//         mbti: 'ISFJ',
//         enneagram: '9w3',
//         variant: 'sp/so',
//         tritype: 725,
//         socionics: 'SEE',
//         sloan: 'RCOEN',
//         psyche: 'FEVL',
//         image: 'https://soulverse.boo.world/images/1.png',
//     },
// ];

router.get('/:id?', async (req, res) => {
    const id = req.params.id;

    const { zodiac, enneagram, mbti, sort } = req.query;

    if (!id) {
        return res.status(400).json({ message: 'Bad Request, id must be requested' });
    }
    if (!ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'Bad Request, id is not a valid' });
    }

    const db = await connect();

    let collection_profiles = db.collection('profiles');
    let collection_comments = db.collection('comments');

    let query_profile = { _id: new ObjectId(id) };
    let query_comments = { id_profile: new ObjectId(id) };

    let profile = await collection_profiles.findOne(query_profile);
    let comments = await collection_comments.find(query_comments).toArray();

    profile.comments =
        zodiac || enneagram || mbti
            ? comments.filter((comment) => {
                  if ((!zodiac || comment.zodiac == zodiac) && (!enneagram || comment.enneagram == enneagram) && (!mbti || comment.mbti == mbti)) {
                      return true;
                  }
              })
            : comments;

    if (sort == 'asc') {
        profile.comments.sort((a, b) => a.created_at - b.created_at);
    } else {
        profile.comments.sort((a, b) => b.created_at - a.created_at);
    }

    if (!profile) {
        return res.status(404).json({ status: 'Not Found' });
    }

    // res.status(200).json(profile);

    res.render('profile_template', {
        profile,
    });
});

router.post('/profile', async (req, res) => {
    const { name, description, mbti, enneagram, variant, tritype, socionics, sloan, psyche } = req.body;

    const db = await connect();
    let profileId;

    let collection = db.collection('profiles');

    let created_at = new Date();

    await collection
        .insertOne({
            name,
            description,
            mbti,
            enneagram,
            variant,
            tritype,
            socionics,
            sloan,
            psyche,
            image: 'https://soulverse.boo.world/images/1.png',
            created_at,
        })
        .then((result) => {
            profileId = result.insertedId;
        });

    return res.status(201).json({ success: true, message: 'Profile Created', id: profileId });
});

router.post('/user', async (req, res) => {
    const { name } = req.body;

    if (!name) {
        return res.status(400).json({ message: 'Bad Request, name must be requested' });
    }

    const db = await connect();
    let userId;

    let collection = db.collection('users');

    let created_at = new Date();

    await collection
        .insertOne({
            name,
            created_at,
        })
        .then((result) => {
            userId = result.insertedId;
        });

    return res.status(201).json({ success: true, message: 'User Created', id: userId });
});

router.post('/:id_profile/addComment', async (req, res) => {
    const body = req.body;
    const { comment, id_user } = body;
    const { id_profile } = req.params;

    if (!id_profile) {
        return res.status(400).json({ success: false, message: 'Bad Request, URL is incorrect' });
    }

    if (!comment || !id_user) {
        return res.status(400).json({ success: false, message: 'Bad Request, lost crucial information' });
    }

    const db = await connect();
    let commentId;

    let collection = db.collection('comments');

    let created_at = new Date();

    await collection
        .insertOne({
            comment,
            id_user: new ObjectId(id_user),
            created_at,
            id_profile: new ObjectId(id_profile),
            MTBI: body?.MTBI,
            enneagram: body?.enneagram,
            zodiac: body?.zodiac,
            likes: 0,
        })
        .then((result) => {
            commentId = result.insertedId;
        });

    return res.status(201).json({ success: true, message: 'Comment Created', id: commentId });
});

router.get('/:id_user/comments', async (req, res) => {
    const { id_user } = req.params;

    if (!id_user) {
        return res.status(400).json({ success: false, message: 'Bad Request, URL is incorrect' });
    }

    if (!ObjectId.isValid(id_user)) {
        return res.status(400).json({ success: false, message: 'Bad Request, id is not a valid' });
    }

    const db = await connect();

    let collection = db.collection('comments');

    let query = { id_user: new ObjectId(id_user) };

    let comments = await collection.find(query).toArray();

    return res.status(200).json({ success: true, comments });
});

// route to like comments
router.post('/comment/:id_comment/like/:id_user', async (req, res) => {
    try {
        const { id_comment, id_user } = req.params;

        if (!id_comment || !id_user) {
            return res.status(400).json({ success: false, message: 'Parameters missing' });
        }

        if (!ObjectId.isValid(id_user) || !ObjectId.isValid(id_comment)) {
            return res.status(400).json({ success: false, message: 'Bad Request, id is not a valid' });
        }

        const db = await connect();
        let commentCollection = db.collection('comments');
        let usersCollection = db.collection('users');

        const comment = await commentCollection.findOne({ _id: new ObjectId(id_comment) });
        if (!comment) {
            return res.status(404).json({ success: false, message: 'Comment not found.' });
        }

        const user = await usersCollection.findOne({ _id: new ObjectId(id_user), likedComments: id_comment });
        if (user) {
            return res.status(400).json({ success: false, message: 'You already liked this comment' });
        }

        await commentCollection.updateOne({ _id: new ObjectId(id_comment) }, { $inc: { likes: 1 } });

        await usersCollection.updateOne({ _id: new ObjectId(id_user) }, { $push: { likedComments: id_comment } });

        res.json({ success: true, likes: comment.likes + 1 });
    } catch (message) {
        res.status(500).json({ success: false, message: message.error });
    }
});

router.post('/comment/:id_comment/unlike/:id_user', async (req, res) => {
    try {
        const { id_comment, id_user } = req.params;

        if (!id_comment || !id_user) {
            return res.status(400).json({ success: false, message: 'Parameters missing' });
        }

        const db = await connect();
        let commentCollection = db.collection('comments');
        let usersCollection = db.collection('users');

        const comment = await commentCollection.findOne({ _id: new ObjectId(id_comment) });
        if (!comment) {
            return res.status(404).json({ success: false, message: 'Comment not found.' });
        }
        const user = await usersCollection.findOne({ _id: new ObjectId(id_user), likedComments: id_comment });
        if (!user) {
            return res.status(400).json({ success: false, message: 'You have not liked this comment before.' });
        }

        await commentCollection.updateOne({ _id: new ObjectId(id_comment) }, { $inc: { likes: -1 } });

        await usersCollection.updateOne({ _id: new ObjectId(id_user) }, { $pull: { likedComments: id_comment } });

        res.json({ success: true, likes: comment.likes - 1 });
    } catch (message) {
        res.status(500).json({ success: false, message: message.error });
    }
});

module.exports = router;
