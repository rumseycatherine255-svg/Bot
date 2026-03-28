const express = require("express");
const noblox = require("noblox.js");

const app = express();
app.use(express.json());

const cookie = "_|WARNING:-DO-NOT-SHARE-THIS.--Sharing-this-will-allow-someone-to-log-in-as-you-and-to-steal-your-ROBUX-and-items.|_CAEaAhADIhwKBGR1aWQSFDExMDE0NDUwMzEyNzQzMTY0NDQ0KAM.l2suxvpqjMZ5CPjGj1HjxHpC-_KCQVgfYCS3RGyXr-CCwPWCD3eb6ai8Q7Cj1pp0RofacZH8zHLFQht4tD_aWkTMIcCxhhO6D7mgFBeZqNHSgyd1sLf852FbteKAA-ChKa0kMQ51BV0CsGcj1HA_zeruSS3djf1u8jGGVW_U7H37i0kj_IAMTwvC5Xb2TiKzAYUCBUkWhVJoVuK_SWUyr0Ro7w0iCwy1luDPu32MPhVFx5W1aVosKIIsjc9_XmAHsh6ha0UT7PLkc89Qn6caAik2SDxmR4JwiamGCeS7JBXQifZghV52oqvlrteJ3ivDYl_tfZD_e5sTwxfdEE_388GLHbrgjIiN0OWvsmD4UbUa8iOG-uF5LQTPRyB8topcys-kHxMMGRStLYtKpJEXUzW26rbZJD_HeMm2LRWCU3AjTpvK0Q82QicYeMr6_AePgVq80zkFukCe5SMjiri5cMmq_pjTTNnGAuAPYytMpWd0E1Q-OCVMMuiA_2QfzOU5aYcN7HUI6spe4Y5k6gv16xMnVXuIV479a0CzXZXLuIoOvSqFIR5NIZj2kb4sUjsIoWI-3YZ1_oZaEsPcCQpu1T-lLfs47CrQU5RYXhaTo-WFMwoR3JuuLOT7HaYY728u8X1lCqh_3dI5llvC3fvCX0Q8V_fuz_BK5nxcGxrpHW3eP_esv6pesSt8KdGAHi1T-S5B24SoCQly_m0Lazf_M06u2XFq4RIBYiH6k7vuRUpPbDQTWUlZ8r_m9yb7-Xr86Dz6Q0Ir_04C-LIk_jmJXI61SraRr1CwKIYPrapig-_U8Y9A";
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
