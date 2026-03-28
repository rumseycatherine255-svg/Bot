const express = require("express");
const noblox = require("noblox.js");

const app = express();
app.use(express.json());

const cookie = "_|WARNING:-DO-NOT-SHARE-THIS.--Sharing-this-will-allow-someone-to-log-in-as-you-and-to-steal-your-ROBUX-and-items.|_CAEaAhADIhsKBGR1aWQSEzcyMzIyOTk5Mjc0NDE4NzcxMTkoBA.Sf630VA5QrLPBUmBDGuS7pBXhxB_TXYEpdyH2w-ZJTGPu9WRcA-ELsx1PxCIsCZN6s8cQ4CmS6tLcL6xO3Wmv99Co2OF19Nx2eAGfn7ihhGS8Z8hioMZuGWazqKMg3fkBDtZsdJUOa3Q5ilDY46GxeKDyWUmOtzPklSlmKhJE7JRT9IKtVyMXbzk13Z27ZQ2SMK1SaurIqu6egttYym-06Gex1zWOrp3__KhBtPuYOuLgQYVzs3CwY7FsL-0HR_lSYw1vwMYUz0CfI6U5zkNZnyIgDLLfobRiw1zlz_idlbC7c4l61G6Nc7larfHxfJns7cG_hsIfC1HwGXjt7jr3-3VeJ_EyifexHrWa7idRrCMwJEiga8diMzbfc_QQ6o3VRa6D5EkNX9kBQ1z2hFnU3uKNCbGSYUUta6zvVCaDJu14iKa_usXWefclgGsT5HDsraY_AxU8Ocedu6HFIIXVDHoAD409tEG6Wrh9TvLX4mEir3UAw2lZ-JvTOnkcqdrcXe3N4mUxhCgBxllMJ27BMfmTkmf2XjpPWvfxj3zMdYEv6fQlY8aiJ719S0L8_5RADhJrhDDoUlqXonNiH80KdFOdu8wgXMNO_nHxBJ4e5leWEIKiPBkLCjPUJli1LfGAg3pqLM9aXsT_xhZl2awx6eNNFZQ0Y5MYegP8UBOCPu6hTcSuOcqUefCwdx19THJvKdueolGO2LIxsPyneUjAQa2oM9FTLQOo5at3m5vshfh8KvEVLgg4A2obDHEL28m_RurlOheCabEuUShnx0XZz2SDWZxzPoqB_WRhs9PWj5ZjbAkMiwJ598l0uW2yHUpI9ypVID67qtIxTRGBAp2KxfrKUqx7jqsZKcEYYw_3ti2eWunTzjQ2DVAdmjBJ9K4u9G77PdmVBkALoLQN5nnTJCh0N3Q4Rm1NHd4i6SUO2sWP2ERPI03MseZf5aNpkqvT1D_jV-Eocqm7ho4kyvILglqKZg";
const groupId = 36063404;

async function start() {
    await noblox.setCookie(cookie);
    console.log("Logged in!");

    app.post("/promote", async (req, res) => {
        const { username } = req.body;
        try {
            const userId = await noblox.getIdFromUsername(username);
            await noblox.promote(groupId, userId);
            res.send("Promoted!");
        } catch (err) {
            console.log(err);
            res.status(500).send("Error promoting");
        }
    });

    app.post("/demote", async (req, res) => {
        const { username } = req.body;
        try {
            const userId = await noblox.getIdFromUsername(username);
            await noblox.demote(groupId, userId);
            res.send("Demoted!");
        } catch (err) {
            res.status(500).send("Error demoting");
        }
    });

    app.post("/setrank", async (req, res) => {
        const { username, rank } = req.body;
        try {
            const userId = await noblox.getIdFromUsername(username);
            await noblox.setRank(groupId, userId, rank);
            res.send("Rank set!");
        } catch (err) {
            res.status(500).send("Error setting rank");
        }
    });

    app.listen(3000, () => console.log("Server running on port 3000"));
}

start();