const fs = require('fs');
const path = require('path');

/**
 * Sweeps the specified directory and deletes any system core dump files.
 * @param {string} targetDir - The directory path to clean up.
 */
function purgeCoreDumps(targetDir) {
  console.log(`🧹 Starting storage sweep in: ${targetDir}`);

  try {
    const files = fs.readdirSync(targetDir);
    let deleteCount = 0;
    let spaceReclaimedBytes = 0;

    files.forEach(file => {
      // Target files that start with "core." followed by the process ID digits
      if (file.startsWith('core.') && !fs.lstatSync(path.join(targetDir, file)).isDirectory()) {
        const filePath = path.join(targetDir, file);
        
        try {
          const stats = fs.statSync(filePath);
          spaceReclaimedBytes += stats.size;
          
          fs.unlinkSync(filePath);
          console.log(`🗑️ Deleted: ${file} (${(stats.size / (1024 * 1024)).toFixed(2)} MiB)`);
          deleteCount++;
        } catch (err) {
          console.error(`❌ Failed to delete ${file}:`, err.message);
        }
      }
    });

    const totalMiB = (spaceReclaimedBytes / (1024 * 1024)).toFixed(2);
    console.log(`✅ Cleanup finished. Removed ${deleteCount} core files. Reclaimed ${totalMiB} MiB.`);

  } catch (error) {
    console.error('❌ Failed to read directory:', error.message);
  }
}

// Run the purge on the current working directory
purgeCoreDumps(process.cwd());
