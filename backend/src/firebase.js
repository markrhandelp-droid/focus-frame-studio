// Firebase Admin SDK setup. The API only uses it to verify the ID token that
// the React app sends in the "Authorization: Bearer <token>" header.
// Verifying a token needs just the Firebase project ID; a service account is
// optional.
const { getApps, initializeApp, cert } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const config = require("./config");

function firebaseAuth() {
    if (!getApps().length) {
        const options = { projectId: config.firebase.projectId || undefined };
        if (config.firebase.serviceAccountBase64) {
            const json = Buffer.from(config.firebase.serviceAccountBase64, "base64").toString("utf8");
            options.credential = cert(JSON.parse(json));
        }
        initializeApp(options);
    }
    return getAuth();
}

// Kept in an object so automated tests can swap in a fake verifier.
const tokenVerifier = {
    verify: (idToken) => firebaseAuth().verifyIdToken(idToken)
};

module.exports = { tokenVerifier };
