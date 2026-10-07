import {collectSource,planSourceSync} from './utils/source-sync.js';
import {catalogDb} from './utils/catalog-job.js';

// Invoked only by the shared scheduler: its lease serializes all catalog writers.
export function sourceHandler(source) {
    return async(req,res)=>{
        try {
            const collected=await collectSource(source);
            const db=await catalogDb();
            const [apps,software,ignored]=await Promise.all([db('apps'),db('software'),db('troypoint_ignored')]);
            const plan=planSourceSync(source,collected.items,apps||{},software||{},ignored||{});
            if(Object.keys(plan.updates).length) await db('',plan.updates);
            if(Object.keys(plan.review).length) await db(`source_review/${source}`,plan.review);
            await db(`source_sync/${source}`,{checkedAt:new Date().toISOString(),pages:collected.pages,failures:collected.failures,...plan.stats});
            // External catalog imports/code edits deliberately do not broadcast APK updates.
            return res.status(collected.failures?503:200).json({success:!collected.failures,...plan.stats,pages:collected.pages,failures:collected.failures});
        } catch(error) {
            try {
                const db=await catalogDb();
                await db(`source_sync/${source}`,{lastError:String(error.message).slice(0,200),lastAttempt:new Date().toISOString()});
            } catch {}
            return res.status(500).json({error:error.message});
        }
    };
}
