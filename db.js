const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize('database_name', 'username', 'password', { // ฐานข้อมูล username และ password ของฐานข้อมูล
    host: '127.0.0.1', // localhost
    dialect: 'mysql', // ฐานข้อมูลที่ใช้
    logging: false
});

const Profile = sequelize.define('Profile', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    username: {
        type: DataTypes.STRING,
        allowNull: false
    },
    line_uid: {
        type: DataTypes.BOOLEAN,
        allowNull: false
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false
    },
}, {
    timestamps: false,
});

const Line_UID = sequelize.define('Line_uid', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    uid: {
        type: DataTypes.STRING,
        allowNull: false
    },
    ref_key: {
        type: DataTypes.STRING,
        allowNull: false
    },
}, {
    tableName: 'line_uid',
    timestamps: true,
    underscored: true,
});

const getProfiles = async () => {
    try {
        const profiles = await Profile.findAll();
        return profiles;
    } catch (error) {
        throw error;
    }
};

const getLineUid = async () => {
    try {
        const Line_Uid = await Line_UID.findAll();
        return Line_Uid;
    } catch (error) {
        throw error;
    }
};

const syncLineUid = async () => {
    await Line_UID.sync({ alter: true });
};

module.exports = {
    sequelize,
    Profile,
    Line_UID,
    getProfiles,
    getLineUid,
    syncLineUid
};