import * as chai from 'chai';
import chaiHttp from 'chai-http';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient } from 'mongodb';

import server from '../app.js';

let mongod, client;

chai.use(chaiHttp);

const setupDatabase = async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    client = new MongoClient(uri);
    await client.connect();
};

const closeDatabase = async () => {
    await client.close();
    await mongod.stop();
};

before((done) => {
    setupDatabase().then(() => done());
});

after((done) => {
    closeDatabase().then(() => done());
});

describe('Routes test', () => {
    it('Will create a new profile', async () => {
        const response = await request(server)
            .post('/profile')
            .send({
                name: 'Profile Test',
                description: 'Descrição do perfil',
                mbti: 'ISTJ',
                enneagram: '2w3',
                variant: 'Social',
                tritype: '135',
                socionics: 'ILI',
                sloan: 'RLUEI',
                psyche: 'Ectomorph',
            })
            .expect(201);

        chai.expect(response.body).to.have.property('success').to.equal(true);
        chai.expect(response.body).to.have.property('message').to.equal('Profile Created');
        chai.expect(response.body).to.have.property('id').to.be.a('string');
    });

    it('Will create a new user', async () => {
        const response = await request(server)
            .post('/user')
            .send({
                name: 'User Test',
            })
            .expect(201);

        chai.expect(response.body).to.have.property('success').to.equal(true);
        chai.expect(response.body).to.have.property('message').to.equal('User Created');
        chai.expect(response.body).to.have.property('id').to.be.a('string');
    });

    it('Will create a new comment', async () => {
        // Supondo que você já tenha um perfil e um usuário criado
        const profileResponse = await request(server).post('/profile').send({
            name: 'Profile Test',
            description: 'Descrição para Teste',
            mbti: 'INTP',
            enneagram: 'Type 5',
            variant: 'Self-preserving',
            tritype: '514',
            socionics: 'ILI',
            sloan: 'RLUEI',
            psyche: 'Mesomorph',
        });

        const userResponse = await request(server).post('/user').send({
            name: 'User Test',
        });

        const response = await request(server)
            .post(`/${profileResponse.body.id}/addComment`)
            .send({
                comment: 'Test Comment',
                id_user: userResponse.body.id,
            })
            .expect(201);

        chai.expect(response.body).to.have.property('success').to.equal(true);
        chai.expect(response.body).to.have.property('message').to.equal('Comment Created');
        chai.expect(response.body).to.have.property('id').to.be.a('string');
    });

    it('Will add like in comment', async () => {
        // Supondo que você já tenha um comentário, perfil e usuário criado
        const profileResponse = await request(server).post('/profile').send({
            name: 'Profile test',
            description: 'Descrição para Like Teste',
            mbti: 'INTP',
            enneagram: 'Type 5',
            variant: 'Self-preserving',
            tritype: '514',
            socionics: 'ILI',
            sloan: 'RLUEI',
            psyche: 'Mesomorph',
        });

        const userResponse = await request(server).post('/user').send({
            name: 'User Test',
        });

        const commentResponse = await request(server).post(`/${profileResponse.body.id}/addComment`).send({
            comment: 'Comment Test',
            id_user: userResponse.body.id,
        });

        const response = await request(server).post(`/comment/${commentResponse.body.id}/like/${userResponse.body.id}`).expect(200);

        chai.expect(response.body).to.have.property('success').to.equal(true);
        chai.expect(response.body).to.have.property('likes').to.be.a('number');
    });

    it('Will remove like in comment', async () => {
        // Supondo que você já tenha um comentário, perfil e usuário criado
        const profileResponse = await request(server).post('/profile').send({
            name: 'Profile test',
            description: 'Descrição para Unlike Teste',
            mbti: 'INTP',
            enneagram: 'Type 5',
            variant: 'Self-preserving',
            tritype: '514',
            socionics: 'ILI',
            sloan: 'RLUEI',
            psyche: 'Mesomorph',
        });

        const userResponse = await request(server).post('/user').send({
            name: 'User Test',
        });

        const commentResponse = await request(server).post(`/${profileResponse.body.id}/addComment`).send({
            comment: 'Comment Test',
            id_user: userResponse.body.id,
        });

        // Dando like primeiro
        await request(server).post(`/comment/${commentResponse.body.id}/like/${userResponse.body.id}`).expect(200);

        const response = await request(server).post(`/comment/${commentResponse.body.id}/unlike/${userResponse.body.id}`).expect(200);

        chai.expect(response.body).to.have.property('success').to.equal(true);
        chai.expect(response.body).to.have.property('likes').to.be.a('number');
    });
});
