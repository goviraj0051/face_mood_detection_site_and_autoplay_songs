const cp = require('child_process');
const fs = require('fs');
const songs = fs.readdirSync('Main songs');
const batchSize = 5;
let total = Math.ceil(songs.length / batchSize);

for(let i = 0; i < songs.length; i += batchSize) {
    const batch = songs.slice(i, i + batchSize);
    console.log(`\nPushing batch ${Math.floor(i/batchSize)+1} of ${total}...`);
    
    batch.forEach(s => {
        cp.execSync(`git add "Main songs/${s}"`);
    });
    
    cp.execSync(`git commit -m "Add songs batch ${Math.floor(i/batchSize)+1}"`);
    
    try {
        cp.execSync('git push origin main', {stdio:'inherit'});
    } catch(e) {
        console.error('Failed to push batch! Exiting.');
        process.exit(1);
    }
}
console.log("\nAll songs have been successfully pushed to GitHub!");
