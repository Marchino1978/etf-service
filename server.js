import express from 'express';
import { config } from './config.js';
import { getAllQuotes, getQuote } from './store.js';
import { runUpdateCycle } from './updater.js';

const app = express();

app.get('/quotes', (req,res)=>res.json(getAllQuotes()));
app.get('/quotes/:symbol', (req,res)=>{
  const q = getQuote(req.params.symbol.toUpperCase());
  if (!q) return res.status(404).json({error:'not found'});
  res.json(q);
});
app.get('/health',(req,res)=>res.json({status:'ok'}));

const port = process.env.PORT || 3000;
app.listen(port, ()=>console.log(`Server on ${port}`));

setInterval(()=>runUpdateCycle(console), config.updateIntervalMin*60*1000);
runUpdateCycle(console);
