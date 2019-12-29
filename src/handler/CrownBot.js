const { Client, SnowflakeUtil } = require("discord.js");
const fs = require("fs");
const path = require("path");
const Sequelize = require("sequelize");
const mongoose = require("mongoose");

class CrownBot extends Client {
	constructor(botOptions, clientOptions) {
		super(clientOptions);
		this.prefix = botOptions.prefix;
		this.token = botOptions.token;
		this.ownerID = botOptions.ownerID;
		this.apikey = botOptions.apikey;
		this.commands = [];
		this.mongoose = mongoose
			.connect(
				botOptions.mongo,
				{
					useNewUrlParser: true,
					useUnifiedTopology: true
				}
			)
			.catch(e => {
				console.log(e);
			});
		this.schema = mongoose.Schema;
		this.sequelize = new Sequelize("database", "user", "password", {
			host: "localhost",
			dialect: "sqlite",
			logging: false,
			storage: "database.sqlite"
		});
		this.queryInterface = this.sequelize.getQueryInterface();
		this.models = {};
		this.url = "https://ws.audioscrobbler.com/2.0/?";
		this.helpers = require("./Helpers");
	}

	loadCommands(dir = path.join(__dirname, "../commands")) {
		const commands = fs.readdirSync(dir);
		commands.forEach(file => {
			if (file.endsWith(".js")) {
				const Command = require(path.join(dir, file));
				const command = new Command();
				this.commands.push(command);
			}
		});
		return this;
	}

	loadEvents(dir = path.join(__dirname, "../events")) {
		const events = fs.readdirSync(dir);
		events.forEach(file => {
			const [eventName] = file.split(".");
			const props = require(path.join(dir, file));
			this.on(eventName, props.bind(null, this));
		});
		return this;
	}

	loadModels(dir = path.join(__dirname, "../models")) {
		const models = fs.readdirSync(dir);
		models.forEach(file => {
			let model2k = require(path.join(dir, file))(mongoose);
			// model.sync()
			const [modelName] = file.split(".");
			let model = mongoose.model(modelName, model2k);
			this.models[modelName.toLowerCase()] = model;
		});
		return this;
	}

	configureLogging() {
		this.addLog = function (data){
			const log = new this.models.log({...data})
			log.save();
		}
		return this;
	}

	init() {
		this.loadCommands()
			.loadEvents()
			.loadModels()
			.configureLogging()
			.login(this.token)
			.then(() => console.log("Logged in."));
	}
}

module.exports = CrownBot;
