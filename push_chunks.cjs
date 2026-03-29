const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function run(cmd) {
    console.log(`Running: ${cmd}`);
    execSync(cmd, { stdio: 'inherit' });
}

try {
    // 1. Remove the songs from the commit temporarily to push the code first
    run('git rm -r --cached "Main songs"');
    run('git commit --amend -m "Initial commit of codebase"');
    run('git push -u origin main');

    // 2. Add songs back in batches of 10
    const songsDir = 'Main songs';
    const songs = fs.readdirSync(songsDir);
    
    let batchSize = 10;
    for (let i = 0; i < songs.length; i += batchSize) {
        const batch = songs.slice(i, i + batchSize);
        console.log(`\nAdding batch ${i/batchSize + 1} of ${Math.ceil(songs.length/batchSize)}...`);
        
        batch.forEach(song => {
            // Need to double quote the path
            run(`git add "Main songs/${song}"`);
        });

        run(`git commit -m "Add songs batch ${i/batchSize + 1}"`);
        run(`git push origin main`);
    }

    console.log("\nALL DONE! Successfully streamed 300MB repository to GitHub in bite-sized chunks to prevent HTTP 408 timeouts.");

} catch (err) {
    console.error("Error occurred:", err.message);
}
