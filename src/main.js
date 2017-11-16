const LineAPI = require('./api');
const { Message, OpType, Location } = require('../curve-thrift/line_types');
let exec = require('child_process').exec;

const myBot = ['u885396f77de32a72849b6bb13bdeafed','uf7c3c593220a325c1c1fa27efeb13a9d','udccb2ccc34b0751fa9281f6ec51f8691','u33e48395655b32cc74775e745211bfd5'];

function isAdminOrBot(param) {
    return myBot.includes(param);
}


class LINE extends LineAPI {
    constructor() {
        super();
        this.receiverID = '';
        this.checkReader = [];
        this.sendMid = 0;
        this.cancelinv = 0;
	    this.invitesc = 0; //inv via sendcontact
        this.leavegroup = 0;
        this.stateStatus = {
            cancel: 0,
            kick: 0,
            wmsg: 1,
            protect: 0,
        }
    }

    getOprationType(operations) {
        for (let key in OpType) {
            if(operations.type == OpType[key]) {
                if(key !== 'NOTIFIED_UPDATE_PROFILE') {
                    console.info(`[* ${operations.type} ] ${key} `);
                }
            }
        }
    }

    poll(operation) {
        if(operation.type == 25 || operation.type == 26) {
            // console.log(operation);
            const txt = (operation.message.text !== '' && operation.message.text != null ) ? operation.message.text : '' ;
            let message = new Message(operation.message);
            this.receiverID = message.to = (operation.message.to === myBot[0]) ? operation.message.from_ : operation.message.to ;
            Object.assign(message,{ ct: operation.createdTime.toString() });
            this.textMessage(txt,message)
        }

        if(operation.type == 13 && this.stateStatus.cancel == 1) {
            this.cancelAll(operation.param1);
        }

           if(operation.type == 11 && this.stateStatus.protect == 1) { //ada update
           // op1 = group nya
           // op2 = yang 'nge' update
           if(!isAdminOrBot(operation.param2)) {
              this._kickMember(operation.param1,[operation.param2]);
             }

           }
	if(operation.type == 13 && this.stateStatus.protect == 1) { //ada yang invite
          // op1 = group nya
          // op2 = yang 'nge' invite
          // op3 = yang 'di' invite
          if(!isAdminOrBot(operation.param3)) {
             this._rejectGroupInvitation(operation.param1,[operation.param3]);
           }
           if(!isAdminOrBot(operation.param2)) {
              this._kickMember(operation.param1,[operation.param2]);
            }

        }
           if(operation.type == 19 && this.stateStatus.protect == 1) { //ada kick
            // op1 = group nya
            // op2 = yang 'nge' kick
            // op3 = yang 'di' kick
            if(isAdminOrBot(operation.param3)) {
               this._inviteMember(operation.param1,[operation.param3]);
            }
            if(!isAdminOrBot(operation.param2)) {
               this._kickMember(operation.param1,[operation.param2]);
            } 

        }
     if(operation.type == 19){//ygngekick di send contact
     if(!isAdminOrBot(operation.param2)){
     	this._add(operation.param2)
         let kicksc = new Message();
         kicksc.to = operation.param1
         kicksc.contentType=13;                                                   		kicksc.contentMetadata = { mid: operation.param2 };
	this._client.sendMessage(0,kicksc)
         }
         }
        
     	
	if(operation.type == 19){//Kalo admin kekick auto reinv
	if(isAdminOrBot(operation.param3)){
	    this._invite(operation.param1,[operation.param3]);
	    let gokil = new Message();
	gokil.to = operation.param1
	gokil.text = `Why you remove my creator from this group?`
	this._client.sendMessage(0,gokil)
	}
	}
	if(operation.type ==16){
	let anu = new Message();
	anu.to = operation.param1
	anu.text = "Thanks for inviting me into your group. Type [lemon:help] to see lemon Bot Help menu."
	let intro = new Message();
	intro.to = operation.param1
	intro.contentType=13;                                                   intro.contentMetadata = { mid: 'u885396f77de32a72849b6bb13bdeafed' };
	this._client.sendMessage(0,intro);
	this._client.sendMessage(0,anu);
	}
	if(operation.type == 15 && this.stateStatus.wmsg == 1) {//ada yang leave
	  let babay = new Message();
		babay.to = operation.param1;
		babay.toType = 2;					
	//	babay.text = `Kenapa left dari`+ginfo.name+'?';
		babay.text = `Good Byeee!!!\n\n(@^o^)/`;
		this._invite(operation.param1,[operation.param2]);
		this._client.sendMessage(0, babay);
	}
   if(operation.type == 17 && this.stateStatus.wmsg == 1) {//ada yang join
	let halobos = new Message();
		halobos.to = operation.param1;
		halobos.toType = 2;
 //         halobos.text = `Welcome to`+ginfo.name+`\nType [lemon:help] For help menu.`;
		halobos.text = `Welcome in.\My name is lemon. type [lemon:help] for help menu.`;
		this._client.sendMessage(0, halobos);

		}
	if(operation.type == 55){ //ada reader

            const idx = this.checkReader.findIndex((v) => {
                if(v.group == operation.param1) {
                    return v
                } 
            })
            if(this.checkReader.length < 1 || idx == -1) {
                this.checkReader.push({ group: operation.param1, users: [operation.param2], timeSeen: [operation.param3] });
            } else {
                for (var i = 0; i < this.checkReader.length; i++) {
                    if(this.checkReader[i].group == operation.param1) {
                        if(!this.checkReader[i].users.includes(operation.param2)) {
                            this.checkReader[i].users.push(operation.param2);
                            this.checkReader[i].timeSeen.push(operation.param3);
                        }
                    }
                }
            }
        }

        if(operation.type == 13) { // diinvite       
                return this._acceptGroupInvitation(operation.param1);
        }
        this.getOprationType(operation);
    }
//	if(operation.type == 17 && this.stateStatus.wmsg == 1){//welcome msg
//	this._sendMessage(seq, 'Welcome to'+ginfo.name+'\nThis is lemon Bot type lemon:help for help menu.');
//	}
//	if(operation.type == 15 && this.stateStatus.wmsg == 1){//ada yg leave.
//	this._sendMessage(seq, 'Bye - byeee');                          //                 }

    async cancelAll(gid) {
        let { listPendingInvite } = await this.searchGroup(gid);
        if(listPendingInvite.length > 0){
            this._cancel(gid,listPendingInvite);
        }
    }

    async searchGroup(gid) {
        let listPendingInvite = [];
        let thisgroup = await this._getGroups([gid]);
        if(thisgroup[0].invitee !== null) {
            listPendingInvite = thisgroup[0].invitee.map((key) => {
                return key.mid;
            });
        }
        let listMember = thisgroup[0].members.map((key) => {
            return { mid: key.mid, dn: key.displayName };
        });

        return { 
            listMember,
            listPendingInvite
        }
    }

       setState(seq) {
        if(isAdminOrBot(seq.from)){
            let [ actions , status ] = seq.text.split(' ');
            const action = actions.toLowerCase();
            const state = status.toLowerCase() == 'on' ? 1 : 0;
            this.stateStatus[action] = state;
            this._sendMessage(seq,`Status: \n${JSON.stringify(this.stateStatus)}`);
        } else {
            this._sendMessage(seq,`You don't have admin access`);
        }
    }
    mention(listMember) {
        let mentionStrings = [''];
        let mid = [''];
        for (var i = 0; i < listMember.length; i++) {
            mentionStrings.push('@'+listMember[i].displayName+'\n');
            mid.push(listMember[i].mid);
        }
        let strings = mentionStrings.join('');
        let member = strings.split('@').slice(1);
        
        let tmp = 0;
        let memberStart = [];
        let mentionMember = member.map((v,k) => {
            let z = tmp += v.length + 1;
            let end = z - 1;
            memberStart.push(end);
            let mentionz = `{"S":"${(isNaN(memberStart[k - 1] + 1) ? 0 : memberStart[k - 1] + 1 ) }","E":"${end}","M":"${mid[k + 1]}"}`;
            return mentionz;
        })
        return {
            names: mentionStrings.slice(1),
            cmddata: { MENTION: `{"MENTIONEES":[${mentionMember}]}` }
        }
    }

    async leftGroupByName(payload) {
        let gid = await this._findGroupByName(payload);
        for (var i = 0; i < gid.length; i++) {
            this._leaveGroup(gid[i]);
        }
    }
    
    async recheck(cs,group) {
        let users;
        for (var i = 0; i < cs.length; i++) {
            if(cs[i].group == group) {
                users = cs[i].users;
            }
        }
        
        let contactMember = await this._getContacts(users);
        return contactMember.map((z) => {
                return { displayName: z.displayName, mid: z.mid };
            });
    }

    removeReaderByGroup(groupID) {
        const groupIndex = this.checkReader.findIndex(v => {
            if(v.group == groupID) {
                return v
            }
        })

        if(groupIndex != -1) {
            this.checkReader.splice(groupIndex,1);
        }
    }

    async textMessage(textMessages, seq) {
        let [ cmd, ...payload ] = textMessages.split(' ');
        payload = payload.join(' ');
        let txt = textMessages.toLowerCase();
        let messageID = seq.id;

	//variable
	var ginfo = await this._getGroup(seq.to);
	var groupCreator = [ginfo.creator.mid];
	var optreply_persenan=['10%','20%','30%','40%','50%','60%','70%','80%','90%','100%']
	var random1 = Math.floor(Math.random()*optreply_persenan.length);
	var reply_persenan=(optreply_persenan[random1]);
	var zagw = payload.replace('gw','kamu').replace('aku','kamu').replace('gue','kamu').replace('ane','kamu').replace('saya','kamu');  
	function isGroupCreator(param) {
	return groupCreator.includes(param);
	}
        if(cmd == 'cancel') {
            if(payload == 'group') {
                let groupid = await this._getGroupsInvited();
                for (let i = 0; i < groupid.length; i++) {
                    this._rejectGroupInvitation(groupid[i])                    
                }
                return;
            }
            if(this.stateStatus.cancel == 1) {
                this.cancelAll(seq.to);
            }
        }
	
        if(txt == 'respon') {
            this._sendMessage(seq, 'Ok My Name Is Lemon');
       }
	if(txt == 'lemon:help'){
	this._sendMessage(seq, '============================\n[Lemon] Public Bot\nHelp Menu.\n============================\n\nâ£Respon - Checking Bot response\nâ£lemon:speed - Checking bot speed\nâ£lemon:point - Create point for silent reader.\nâ£lemon:view - view sider from the point.\nâ£lemon:ginfo - Checking group info.\nâ£lemon:creator - Creator lemon Bot.\nâ£lemon:groupcreator - lemon send contact this group creator\nâ£lemon:mentionall - mention all members.\nâ£lemon @bye - lemon leave from group.\nâ£lemon:gift - lemon will send gift.\nâ£lemon:contactinfo - For showing contact info. \nâ£lemon:invite - Invite someone into this group by send contact. \n\n============================\nAdd my creator http://line.me/ti/p/PXD0Yq35b2 (@×_×)/\n============================');
	}
        if(txt == 'admincheck') {
          if(isAdminOrBot(seq.from)) {
        this._sendMessage(seq, 'You have admin access.');
        }
      else
        {
         this._sendMessage(seq, 'You dont have admin access');
         }
     }
              if(txt == 'status' && isAdminOrBot(seq.from)) {
            this._sendMessage(seq,`Status: \n${JSON.stringify(this.stateStatus)}`);
  }
	if(txt == 'lemon:gift') {
       	seq.contentType = 9
           seq.contentMetadata = {'PRDID': 'a0768339-c2d3-4189-9653-2909e9bb6f58','PRDTYPE': 'THEME','MSGTPL': '5'};
           this._client.sendMessage(1, seq);
        }
        if(txt == 'lemon:speed') {
            const curTime = (Date.now() / 1000);
            await this._sendMessage(seq,'Loading...');
            const rtime = (Date.now() / 1000) - curTime;
            await this._sendMessage(seq, `${rtime} second\n\n(@^o^)/`);
        }
	if (txt == 'lemon:groupcreator'){

    	let gcreator = await this._getGroup(seq.to);
    	seq.contentType = 13;
    	seq.contentMetadata = {mid: gcreator.creator.mid, displayName: gcreator.creator.displayName};
    	this._client.sendMessage(1, seq);
	}
        if(txt == 'lemon:mentionall') {
	let { listMember } = await this.searchGroup(seq.to);
     	const mentions = await this.mention(listMember);
        seq.contentMetadata = mentions.cmddata; await this._sendMessage(seq,mentions.names.join(''))
        }
	if(cmd == 'say') { //ngomong
            for (var i = 0; i < 1; i++) {
                this._sendMessage(seq,payload);
            }
        }
        if(txt == 'lemon:contactinfo' && this.sendMid == 0){
        this.sendMid = 1
        this._sendMessage(seq,`Send contact to show the data`)
        }
        if(seq.contentType == 13 && this.sendMid == 1){
        	this.sendMid = 0;
        			let midnya = seq.contentMetadata.mid;
				let miku = new Message();
				miku.to = seq.to;
				let orangnya = await this._getContacts([midnya]);
				miku.text =
"\n[Display Name] : "+orangnya[0].displayName+"\n\
\n[MID] : \n"+orangnya[0].mid+"\n\
\n[Status Message] : \n"+orangnya[0].statusMessage+"";
				this._client.sendMessage(0,miku);
		}
        if(txt === 'kernelo') {
            exec('uname -a;ptime;id;whoami',(err, sto) => {
                this._sendMessage(seq, sto);
            })
        }
	if(txt === 'lemon:ginfo'){
	this._sendMessage(seq, 'Group Name:\n'+ginfo.name+'\n\nGroup ID:\n'+ginfo.id+'\n\nGroup Creator:\n'+ginfo.creator.displayName+'');
	}
        if(txt === 'kickall' && this.stateStatus.kick == 1 && isAdminOrBot(seq.from)) {
            let { listMember } = await this.searchGroup(seq.to);
            for (var i = 0; i < listMember.length; i++) {
                if(!isAdminOrBot(listMember[i].mid)){
                    this._kickMember(seq.to,[listMember[i].mid])
                }
            }
        }
	if(cmd == 'invite' && this.invitesc == 1){
		this._add(payload);
		this._invite(seq.to,[payload]);
		this.invitesc = 0
	}
	if(txt == 'lemon:invite' && this.invitesc == 0){
	    	this._sendMessage(seq, `Send contact or send MID for invite that person into `+ ginfo.name + `\n(type "invite [mid]" for invite by mid)`);
	    	this.invitesc = 1
	}
	if(seq.contentType == 13 && this.invitesc == 1) {
		let invsc = seq.contentMetadata.mid
		this._add(invsc);
		this._invite(seq.to,[invsc]);
		this.invitesc = 0
		this.cancelinv = 1
		seq.contentType = 0;
		seq.text = `invited ` + seq.contentMetadata.displayName +`\ntype 'cancel `+seq.contentMetadata.mid+ ` to undo.`;
		this._client.sendMessage(0, seq);
	}
	if(cmd == 'cancel'){
		this._cancel(seq.to,[payload]);
		this.cancelinv = 0
		}
        if(txt == 'lemon:point') {
            this._sendMessage(seq, `Point for check reader created. type 'lemon:view' for lookup.`);
            this.removeReaderByGroup(seq.to);
        }

        if(txt == 'lemon:clear') {
            this.checkReader = []
            this._sendMessage(seq, `Cleared the view point.`);
        }  

        if(txt == 'lemon:view'){
            let rec = await this.recheck(this.checkReader,seq.to);
            const mentions = await this.mention(rec);
            seq.contentMetadata = mentions.cmddata;
            await this._sendMessage(seq,mentions.names.join(''));
            }

        if(txt == 'lemon:creator') {
           let txt = await this._sendMessage(seq, `This is my Creator don't forget to add.\n(@^o^)/`);
           seq.contentType=13;
           seq.contentMetadata = { mid: 'u885396f77de32a72849b6bb13bdeafed' };
           this._client.sendMessage(0, seq);
        }
        if(cmd == 'lemon:showmid'){
        	this._add(payload);
        	seq.contentType=13;
       	 seq.contentMetadata = {mid :payload};
       this._client.sendMessage(1,seq);
       }

      //  if(seq.contentType ==// 13 && this.//stateStatus.mid == 1) {
//            seq.contentType = 0
      //      this._sendMessage(seq,seq.contentMetadata.mid);
 //;       }

        if(txt == 'setpoint for check reader .') {
            this.searchReader(seq);
        }

        if(txt == 'clearall') {
            this.checkReader = [];
        }

        const action = ['cancel on','cancel off','kick on','kick off','protect on','protect off','wmsg on','wmsg off']
        if(action.includes(txt)) {
            this.setState(seq)
        }
	
        if(txt == 'lemon:myid') {
            this._sendMessage(seq,`MID Anda : ${seq.from}`);
        }

        const joinByUrl = ['ourl','curl'];
        if(joinByUrl.includes(txt) && isAdminOrBot(seq.from)) {
            let updateGroup = await this._getGroup(seq.to);
            updateGroup.preventJoinByTicket = true;
            if(txt == 'ourll') {
                updateGroup.preventJoinByTicket = false;
                const groupUrl = await this._reissueGroupTicket(seq.to)
                this._sendMessage(seq,`line://ti/g/${groupUrl}`);
            }
            await this._updateGroup(updateGroup);
        }

        if(cmd == 'ajzmzjd') { //untuk join group pake qrcode contoh: join line://anu/g/anu
            const [ ticketId ] = payload.split('g/').splice(-1);
            let { id } = await this._findGroupByTicket(ticketId);
            await this._acceptGroupInvitationByTicket(id,ticketId);
        }
	

	if(cmd == 'spam' && isAdminOrBot(seq.from)){
	const [  j, kata ] = payload.split('/');
	for (var i=0; i <j; i++) {
	this._sendMessage(seq,`${kata}`);
	}
	}


        if(cmd == 'slain' && isAdminOrBot(seq.from)){
           let target = payload.replace('@','');
           let group = await this._getGroups([seq.to]);
           let gm = group[0].members;
              for(var i = 0; i < gm.length; i++){
                     if(gm[i].displayName == target){
                                  target = gm[i].mid;
                     }
               }
               this._kickMember(seq.to,[target]);
        }
         if(cmd == 'kill' && isAdminOrBot(seq.from)){
           let target = payload.replace('@','');
           let group = await this._getGroups([seq.to]);
           let gm = group[0].members;
              for(var i = 0; i < gm.length; i++){
                     if(gm[i].displayName == target){
                                  target = gm[i].mid;
                     }
               }
               this._kickMember(seq.to,[target]);
               this._invite(seq.to,[target]);
               this._cancel(seq.to,[target]);
        }
	if(cmd == 'mid' && isAdminOrBot(seq.from)){
           let target = payload.replace('@','');
	   let group = await this._getGroups([seq.to]);
           let gm = group[0].members;
              for(var i = 0; i < gm.length; i++){
                     if(gm[i].displayName == target){
                                  target = gm[i].mid;            
		     }
               }
    	       this._sendMessage(seq,target);
        }
        if(cmd == 'spamwkwk' && isAdminOrBot(seq.from)) {
            for(var i= 0; i < 100;  i++) {
               this._sendMessage(seq, 'I Love Hentai~');
        }
	}
	if(cmd == "Steal") {
        let target = payload.replace('@','');
        let group = await this._getGroups([seq.to]);
        let gm = group[0].members;
        let contact = await this._getContacts(seq.to,[target]);
        path = "http://dl.profile.line-cdn.net/"+contact.pictureStatus;
           for(var i = 0; i < gm.length; i++) {
                if(gm[i].displayName == target) {
                        target = gm[i].mid;
                }
            }
                 await this._client.sendImageWithURL(seq.to,[path]);
}
	if(cmd == 'dimanakah'){
	let optreply_locasi=['Toilet','Kamar','Rumah','Sekolah','Rumah sakit','Restoran','deket kamu','sana','sini']            
	let random3 = Math.floor(Math.random()*optreply_locasi.length);
	let reply_locasi=(optreply_locasi[random3]);
	this._sendMessage(seq, `${zagw} berada di ${reply_locasi}`);
	}
	if(cmd == 'dosa'){ 		
	let optreply_dosa=['0% Selamat kamu masih suci!','10%','20%','30%','40%','50%','60%','70%','80%','90%','100% Tobat woe!']
        let randomdosa = Math.floor(Math.random()*optreply_dosa.length);
        let reply_dosa=(optreply_dosa[randomdosa]);             
	this._sendMessage(seq, `Persentase dosa ${zagw} sekitar ${reply_dosa}`);       
	}
	if(cmd == 'kapankah'){
        let optreply_kapan=['sekarang','1 abad lagi','28 hari lagi','25 hari lagi','20 hari lagi','5 tahun lagi','tidak akan terjadi','mungkin 5 menit lagi','sebulan lagi','5 hari lagi','bisa kapan saja']
        let randomkapan = Math.floor(Math.random()*optreply_kapan.length);
        let reply_kapan=(optreply_kapan[randomkapan]);   
         this._sendMessage(seq,`${zagw} ${reply_kapan}`);
	}
	if(cmd == 'apakah'){
	let optreply_jawaban=['Ya','Tidak']
	let random2 = Math.floor(Math.random()*optreply_jawaban.length);
	let reply_persenan=(optreply_jawaban[random2]);
	this._sendMessage(seq, reply_persenan);
	}
	if(cmd == 'lemon:love'){
	const [ luv, lav ] = payload.split('-');
	let optreply_love=['Persentase : 0% Kurang cocok.','10%','Persentase : 20%','Persentase : 30%','Persentase : 40%','Persentase : 50%','Persentase : 60%','Persentase : 70%','Persentase : 80%','Persentase : 90%','Persentase : 100% Sangat cocok!']
	let randomlove= Math.floor(Math.random()*optreply_love.length);         let reply_love=(optreply_love[randomlove]);
	this._sendMessage(seq, `Hasil perjodohan ${luv} dan ${lav} :\n\n${reply_love}`);
	}
//spm <jumlah>-<NamaGrup>/<mid>
//spm 100-NamaGrupnya/midkorban
	if(txt == 'lemon:adminhelp' && isAdminOrBot(seq.from)){
	this._sendMessage(seq, '[lemon] Public Bot Admin Help Menu. \n\nlemon:gname\nlemon:cname\nlemon:bio\nourl-curl\nslain @\nspam\nspm');
	}
	if(cmd == 'lemon:gname' && isAdminOrBot(seq.from)){
	let jagungg = await this._getGroup(seq.to);
	jagungg.name = payload.replace('@','');
	this._updateGroup(jagungg);
	this._sendMessage(seq, `Group name changed to '${jagungg.name}'`);
	}
   if(cmd == 'lemon:cname' && isAdminOrBot(seq.from)){
		let namabot = await this._myProfile();
		namabot.displayName = payload.replace('@','');
		this._updateProfile(namabot);
		this._sendMessage(seq, `Display Name changed to '${namabot.displayName}'`); 
										}
	if(cmd == 'lemon:bio' && isAdminOrBot(seq.from)){
                let bio = await this._myProfile();
                bio.statusMessage = payload.replace('@','');
                this._updateProfile(bio);
                this._sendMessage(seq, `Status Message (bio) changed to '${bio.statusMessage}'`);   
        }
	if(txt == 'spm'){
	    this._sendMessage(seq, 'spm <jumlah>-<mamagrup>/<mid>');
	}
        if(cmd == 'spm' && isAdminOrBot(seq.from)) { 
            const [ j, u ] = payload.split('-');
            const [ n, m ] = u.split('/');
            for (var i = 0; i < j; i++) {
                this._createGroup(`${n}`,[m]);
            }
	}
        if(txt == 'lemon @bye') {
          let txt = await this._sendMessage(seq, 'Are you sure? ×_×(yes/no)');
          this.leavegroup = 1
        }
        if(txt == 'yes' && this.leavegroup == 1){
        let txt = await this._sendMessage(seq, 'Bye!!')
        this.leavegroup = 0
        this._leaveGroup(seq.to);
        }
        if(txt == 'no' && this.leavegroup == 1){
        this._sendMessage(seq, "Okay! :D")
        this.leavegroup = 0
        }

        if(cmd == 'lirik') {
            let lyrics = await this._searchLyrics(payload);
            this._sendMessage(seq,lyrics);
        }

        if(cmd === 'ÂÂÂÂ') {
            exec(`curl ipinfo.io/${payload}`,(err, res) => {
                const result = JSON.parse(res);
                if(typeof result.error == 'undefined') {
                    const { org, country, loc, city, region } = result;
                    try {
                        const [latitude, longitude ] = loc.split(',');
                        let location = new Location();
                        Object.assign(location,{ 
                            title: `Location:`,
                            address: `${org} ${city} [ ${region} ]\n${payload}`,
                            latitude: latitude,
                            longitude: longitude,
                            phone: null 
                        })
                        const Obj = { 
                            text: 'Location',
                            location : location,
                            contentType: 0,
                        }
                        Object.assign(seq,Obj)
                        this._sendMessage(seq,'Location');
                    } catch (err) {
                        this._sendMessage(seq,'Not Found');
                    }
                } else {
                    this._sendMessage(seq,'Location Not Found , Maybe di dalem goa');
                }
            })
        }
    }

}

module.exports = new LINE();
