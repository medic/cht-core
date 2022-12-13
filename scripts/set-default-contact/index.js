'use strict'
import request from 'request-promise-native';
import express from 'express';

const app = express();
app.use(express.json());

const compileUrl = (path) => {
    try {
        return new URL(path, process.env.COUCH_URL);
    } catch(e) {
        throw new Error(`Error while creating url: ${e.message}`);
    }
};

const getChtUsers = async function(){
    console.log('   Using URL taken from COUCH_URL env var: ', process.env.COUCH_URL)
    console.log('')
    const url = compileUrl('/api/v2/users');
    const options = {
        uri: url.href,
        json: true
    };

    return request.get(options)
        .then(users => {
            if (typeof users == 'object' ){
                console.log('   Found' , users.length, "users\n")
                return users
            }
        });
};

const getObjectFromMedicDb = async function(id){
    const url = compileUrl('/medic/' + id);
    const options = {
        uri: url.href,
        json: true
    };

    return request.get(options)
        .then(object => {
            return object;
        })

};

const hasDefaultContact = async function(user){
    if(typeof user.place == 'object' && typeof user.contact == 'object' &&  user.place._id  ){
        const place = await getObjectFromMedicDb(user.place._id);
        if (process.env.DEBUG === "True"){
            console.log("place",place);
            console.log("user",user);
        }
        return !(typeof place.contact == 'object' && !place.contact._id);
    } else {
        // return true for invalid users like admin or medic so we don't process them
        return true;
    }
};

const filterUsersForDefaultPlace = async function(users){
    let filteredUsers = [];
    for (const user of users) {
        const defaultSet = await hasDefaultContact(user);
        if(!defaultSet){
            filteredUsers.push(user);
        }
    }
    return filteredUsers;
};

const savePlace = async (placeId, contactId) => {
    const url = compileUrl('/medic/' + placeId);
    const placeObj = await getObjectFromMedicDb(placeId);
    placeObj.contact._id = contactId;
    placeObj.contact.parent = {_id: placeId};
    const options = {
        uri: url.href,
        json: true,
        body: placeObj
    };
    return request.put(options);
};


const setContactsAsPlacesDefaults = async function (filteredUsers){
    let count = 0;
    for (const user of filteredUsers) {
        const defaultSet = await hasDefaultContact(user);
        const placeId = user.place._id;
        const contactId = user.contact._id;
        console.log('   Setting default place for user', user.id)
        await savePlace(placeId, contactId);
        count++;
    }
    return count;
};

const go = async () => {
    console.log("\nStart\n");
    try {
        const allUsers = await getChtUsers();
        const filteredUsers = await filterUsersForDefaultPlace(allUsers);
        const updatedCount = await setContactsAsPlacesDefaults(filteredUsers);
        console.log("\n   Updated", updatedCount, 'users');
    } catch (e) {
        if (e.statusCode === 401) {
            console.log('   Bad authentication for CouchDB. Check that COUCH_URL has correct username and password.');
        } else {
            console.log("   Error!! " + e.message);
            if (process.env.DEBUG === "True"){
                console.log("\n" + e.stack);
            } else {
                console.log("\n   Pass DEBUG=True to see stack trace");
            }
        }
    }
};


const myArgs = process.argv.slice(2);
go().then(() => console.log('\nEnd\n'));
