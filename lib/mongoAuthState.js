// Baileys auth state stored fully in MongoDB (creds + keys).
// Replaces useMultiFileAuthState so nothing is lost when the host redeploys.
const { initAuthCreds, BufferJSON, proto } = require('@whiskeysockets/baileys');
const { Session, AuthKey } = require('./database');

async function useMongoAuthState(number) {
    const cleanNumber = number.replace(/[^0-9]/g, '');

    // Load creds (old sessions saved by the previous version still work)
    const stored = await Session.findOne({ number: cleanNumber });
    const creds = stored && stored.credentials
        ? JSON.parse(JSON.stringify(stored.credentials), BufferJSON.reviver)
        : initAuthCreds();

    const keys = {
        get: async (type, ids) => {
            const data = {};
            const names = ids.map(id => `${type}-${id}`);
            const docs = await AuthKey.find({ number: cleanNumber, key: { $in: names } });
            const map = new Map(docs.map(d => [d.key, d.value]));

            for (const id of ids) {
                const raw = map.get(`${type}-${id}`);
                if (!raw) continue;
                let value = JSON.parse(raw, BufferJSON.reviver);
                if (type === 'app-state-sync-key' && value) {
                    value = proto.Message.AppStateSyncKeyData.fromObject(value);
                }
                data[id] = value;
            }
            return data;
        },
        set: async (data) => {
            const ops = [];
            for (const type in data) {
                for (const id in data[type]) {
                    const value = data[type][id];
                    const key = `${type}-${id}`;
                    if (value) {
                        ops.push({
                            updateOne: {
                                filter: { number: cleanNumber, key },
                                update: { $set: { value: JSON.stringify(value, BufferJSON.replacer) } },
                                upsert: true
                            }
                        });
                    } else {
                        ops.push({ deleteOne: { filter: { number: cleanNumber, key } } });
                    }
                }
            }
            if (ops.length) await AuthKey.bulkWrite(ops, { ordered: false });
        }
    };

    const saveCreds = async () => {
        await Session.findOneAndUpdate(
            { number: cleanNumber },
            {
                credentials: JSON.parse(JSON.stringify(creds, BufferJSON.replacer)),
                updatedAt: new Date()
            },
            { upsert: true, new: true }
        );
    };

    return { state: { creds, keys }, saveCreds };
}

module.exports = { useMongoAuthState };
