import jwt from 'jsonwebtoken'; import User from '../models/User.js';
export async function optionalAuth(req,res,next){try{const token=req.headers.authorization?.replace('Bearer ','');if(token){const payload=jwt.verify(token,process.env.JWT_SECRET);req.user=await User.findById(payload.id);}next();}catch{next();}}
export function requireAuth(req,res,next){if(!req.user)return res.status(401).json({error:'Authentication required'});next();}
export const allowRoles=(...roles)=>(req,res,next)=>roles.includes(req.user?.role)?next():res.status(403).json({error:'Insufficient permissions'});
