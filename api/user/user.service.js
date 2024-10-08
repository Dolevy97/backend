import { dbService } from '../../services/db.service.js'
import { logger } from '../../services/logger.service.js'

import { ObjectId } from 'mongodb'

export const userService = {
	query,
	getById,
	getByUsername,
	remove,
	update,
	add,
	removeBoardFromFavorites
}

async function query(filterBy = {}) {
	const criteria = _buildCriteria(filterBy)
	try {
		const collection = await dbService.getCollection('user')
		var users = await collection.find(criteria).sort({ nickname: -1 }).toArray()
		users = users.map(user => {
			delete user.password
			return user
		})
		return users
	} catch (err) {
		logger.error('cannot find users', err)
		throw err
	}
}

async function getById(userId) {
	try {
		const collection = await dbService.getCollection('user')
		const user = await collection.findOne({ _id: ObjectId.createFromHexString(userId) })
		delete user.password
		return user
	} catch (err) {
		logger.error(`while finding user ${userId}`, err)
		throw err
	}
}
async function getByUsername(username) {
	try {
		const collection = await dbService.getCollection('user')
		const user = await collection.findOne({ username })
		return user
	} catch (err) {
		logger.error(`while finding user ${username}`, err)
		throw err
	}
}

async function remove(userId) {
	try {
		const collection = await dbService.getCollection('user')
		await collection.deleteOne({ _id: ObjectId.createFromHexString(userId) })
	} catch (err) {
		logger.error(`cannot remove user ${userId}`, err)
		throw err
	}
}

async function update(user) {
	try {
		// peek only updatable fields!
		const userToSave = {
			_id: ObjectId.createFromHexString(user._id),
			username: user.username,
			fullname: user.fullname,
			favorites: user.favorites,
			imgUrl: user.imgUrl
		}
		const collection = await dbService.getCollection('user')
		await collection.updateOne({ _id: userToSave._id }, { $set: userToSave })
		return userToSave
	} catch (err) {
		logger.error(`cannot update user ${user._id}`, err)
		throw err
	}
}

async function add(user) {
	try {
		// Validate that there is no such user:
		const existUser = await getByUsername(user.username)
		if (existUser) throw new Error('Username taken')


		const userToAdd = {
			username: user.username,
			password: user.password,
			fullname: user.fullname,
			imgUrl: user.imgUrl,
			favorites: []
		}
		const collection = await dbService.getCollection('user')
		await collection.insertOne(userToAdd)
		return userToAdd
	} catch (err) {
		logger.error('cannot insert user', err)
		throw err
	}
}

async function removeBoardFromFavorites(boardId) {
	try {
		const collection = await dbService.getCollection('user')
		const result = await collection.updateMany(
			{ favorites: boardId },
			{ $pull: { favorites: boardId } }
		);

		return {
			message: 'Board removed from favorites successfully',
			modifiedCount: result.modifiedCount
		};
	} catch (error) {
		console.error('Error removing board from favorites:', error);
		throw error
	}
}



function _buildCriteria(filterBy) {
	const criteria = {}
	if (filterBy.txt) {
		const txtCriteria = { $regex: filterBy.txt, $options: 'i' }
		criteria.$or = [
			{
				username: txtCriteria,
			},
			{
				fullname: txtCriteria,
			},
		]
	}
	return criteria
}
