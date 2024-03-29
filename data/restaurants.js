const mongoCollections = require('../config/mongoCollections');
const restaurants = mongoCollections.restaurants;
const { ObjectId } = require("mongodb");

async function getAllRestaurants() {
    const restaurantsCollection = await restaurants();
    return await restaurantsCollection.find({}).toArray();
}

async function getRestaurantById(id) {
    if (!id) throw 'id cannot be undefined';
    if (typeof id !== "string") throw 'id must be of type string';
    const parsedId = ObjectId(id);
    const restaurantsCollection = await restaurants();
    const restaurant = await restaurantsCollection.findOne({ _id: parsedId });
    if (restaurant == undefined) throw 'restaurant does not exist with the given id';
    restaurant._id = restaurant._id.toString();
    return restaurant;
}

async function addRestaurant(restaurant) {
    validateRestaurant(restaurant);
    const restaurantsCollection = await restaurants();
    const insertInfo = await restaurantsCollection.insertOne(restaurant);
    if (insertInfo.insertedCount === 0) throw 'Insertion failed!';
    // TODO calculate nearByRestaurants after saving to DB in one of the layers
    const restaurantList = await this.getAllRestaurants();
    if (restaurantList && restaurantList.length > 0) {
        for (let rest of restaurantList) {
            if (rest._id.toString() != insertInfo.insertedId.toString() && 
            calculateDistance(restaurant.location.latitude, restaurant.location.longitude, rest.location.latitude, rest.location.longitude) <= 10) {
                if (!restaurant.nearByRestaurants) restaurant.nearByRestaurants = [];
                if (!rest.nearByRestaurants) rest.nearByRestaurants = [];
        
                restaurant.nearByRestaurants.push(rest._id.toString());
                rest.nearByRestaurants.push(insertInfo.insertedId.toString());
                await this.updateRestaurant(insertInfo.insertedId.toString(), restaurant);
                await this.updateRestaurant(rest._id.toString(), rest);
            }
        }
    }
    
    return await this.getRestaurantById(insertInfo.insertedId.toString());
}

function validateRestaurant(restaurant) {
    const allowedCategories = ['Fast Food', 'Ethnic', 'Fast Casual', 'Casual Dining', 'Premium Casual', 'Family Style', 'Fine Dining'];
    const allowedServiceModes = ['Dine-in', 'Takeaway', 'Delivery'];
    const allowedDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    if (!restaurant) throw 'restaurant cannot be undefined';
    if (!restaurant.name || typeof restaurant.name !== "string" || !restaurant.name.trim()) throw 'Invalid restaurant name';
    if (!restaurant.menu || typeof restaurant.menu !== "string" || !restaurant.menu.trim()) throw 'Invalid menu link';
    if (!restaurant.owner || typeof restaurant.owner !== "string" || !restaurant.owner.trim()) throw 'Invalid email address';
    const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    if (!re.test(String(restaurant.owner).toLowerCase())) {
        throw 'Invalid email address format';
    }
    if (!restaurant.categories || !Array.isArray(restaurant.categories)) throw 'Invalid categories';
    for (const category of restaurant.categories) {
        if (!allowedCategories.includes(category)) throw 'Invalid category in categories';
    }
    // because featuredItems can be optional
    if (restaurant.featuredItems) {
        if (!Array.isArray(restaurant.featuredItems)) throw 'Invalid format for featuredItems field';
        for (const item of restaurant.featuredItems) {
            if (typeof item !== "object" || Array.isArray(item)) throw 'Invalid format for items inside featuredItems';
            if (Object.keys(item).length != 1) throw 'Invalid number of key-values inside an item';
            for (const key of Object.keys(item)) {
                if (typeof key !== "string" || !key.trim()) throw 'Invalid key for key-value inside an item';
                if (typeof item[key] !== "string" || !item[key].trim() || item[key].charAt(0) !== '$' || Number.isNaN(item[key].substring(1))) throw 'Invalid value for key-value inside an item';
            }
        }
    }
    if (!restaurant.location || typeof restaurant.location !== "object" || Array.isArray(restaurant.location)) throw 'Invalid restaurant location';
    if (!restaurant.location.address || typeof restaurant.location.address !== "string" || !restaurant.location.address.trim()) throw 'Invalid location address';
    if (restaurant.location.latitude == undefined || typeof restaurant.location.latitude !== "number") throw 'Invalid location latitude';
    if (restaurant.location.longitude == undefined || typeof restaurant.location.longitude !== "number") throw 'Invalid location longitude';
    if (!restaurant.serviceModes || !Array.isArray(restaurant.serviceModes)) throw 'Invalid service modes';
    for (const serviceMode of restaurant.serviceModes) {
        if (!allowedServiceModes.includes(serviceMode)) throw 'Invalid serviceMode in serviceModes';
    }
    if (!restaurant.hours || typeof restaurant.hours !== "object") throw 'Invalid hours';
    for (const key of Object.keys(restaurant.hours)) {
        if (!allowedDays.includes(key)) throw 'Invalid day of the week';
        // specify formatting for hours from UI
    }
}

async function updateRestaurant(id, restaurant) {
    validateRestaurant(restaurant);
    let parsedId = ObjectId(id);
    const restaurantsCollection = await restaurants();
    await restaurantsCollection.updateOne({ _id: parsedId }, { $set: restaurant });
    return await this.getRestaurantById(id);
}

async function removeRestaurant(id) {
    let parsedId = ObjectId(id);
    const restaurantsCollection = await restaurants();
    const deletionInfo = await restaurantsCollection.removeOne({ _id: parsedId });
    if (deletionInfo.deletedCount === 0) throw 'Deletion failed!';
}

async function addReviewToRestaurant(restaurantId, reviewId) {
    if (!restaurantId || typeof restaurantId !== "string" || !restaurantId.trim()) throw 'Invalid restaurantId';
    if (!reviewId || typeof reviewId !== "string" || !reviewId.trim()) throw 'Invalid reviewId';
    let parsedId = ObjectId(restaurantId);
    const restaurantsCollection = await restaurants();
    restaurantsCollection.updateOne({ _id: parsedId }, { $addToSet: { reviews: reviewId } });
}

async function removeReviewFromRestaurant(restaurantId, reviewId) {
    if (!restaurantId || typeof restaurantId !== "string" || !restaurantId.trim()) throw 'Invalid restaurantId';
    if (!reviewId || typeof reviewId !== "string" || !reviewId.trim()) throw 'Invalid reviewId';
    let parsedId = ObjectId(restaurantId);
    const restaurantsCollection = await restaurants();
    const updateInfo = restaurantsCollection.updateOne({ _id: parsedId }, { $pull: { reviews: reviewId } });
    if (!updateInfo.matchedCount) throw 'Restaurant with restaurantId not found!';
}

function calculateDistance(lat1, lng1, lat2, lng2) {
    var R = 3958.8;
    var rlat1 = lat1 * (Math.PI/180);
    var rlat2 = lat2 * (Math.PI/180);
    var difflat = rlat2-rlat1;
    var difflon = (lng2-lng1) * (Math.PI/180);

    var d = 2 * R * Math.asin(Math.sqrt(Math.sin(difflat/2)*Math.sin(difflat/2)+Math.cos(rlat1)*Math.cos(rlat2)*Math.sin(difflon/2)*Math.sin(difflon/2)));
    return d;
}

module.exports = { getAllRestaurants, getRestaurantById, addRestaurant, updateRestaurant, removeRestaurant, addReviewToRestaurant, removeReviewFromRestaurant }