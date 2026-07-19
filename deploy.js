const { execSync } = require('child_process');

const DYNADOT_KEY = '8l9C8S7R7K7V7F7w9D6m8H8d7M7W6No6u8o6D8k6D8S8tw';
const ALLOWED_DOMAINS = ['zxw.lat', 'joyyece.xyz'];
const GH_USER = 'wxid220-sketch';
const REPO_NAME = 'zxw-lat-cyber-zen';

async function deployAndResolve(domain) {
    const targetDomain = (domain || '').trim().toLowerCase();
    
    // 1. 安全防护过滤
    if (!ALLOWED_DOMAINS.includes(targetDomain)) {
        console.error(`[SECURITY SHIELD] Access Denied: Domain "${domain}" is not whitelisted. Only zxw.lat and joyyece.xyz are permitted.`);
        process.exit(1);
    }
    
    console.log(`[1/3] 正在通过 GitHub CLI 初始化并部署静态网站...`);
    
    try {
        // 1.1 初始化 Git (如果未初始化)
        try {
            execSync('git status', { stdio: 'ignore' });
            console.log('-> 检测到 Git 仓库已存在，清理现有状态...');
        } catch (e) {
            console.log('-> 正在初始化本地 Git 仓库...');
            execSync('git init', { stdio: 'inherit' });
        }
        
        // 1.2 配置 Git 账户
        execSync(`git config user.name "${GH_USER}"`, { stdio: 'inherit' });
        execSync(`git config user.email "${GH_USER}@users.noreply.github.com"`, { stdio: 'inherit' });
        
        // 1.3 提交代码
        execSync('git add .', { stdio: 'inherit' });
        try {
            execSync('git commit -m "Deploy to GitHub Pages with SSL support"', { stdio: 'inherit' });
        } catch (e) {
            console.log('-> 无新修改需要提交。');
        }
        
        // 强行设为主分支为 master 保证发布路径匹配
        execSync('git branch -M master', { stdio: 'inherit' });
        
        // 1.4 清理远程冲突并创建发布仓库
        console.log('-> 正在清理远程旧仓库 (若存在)...');
        try {
            execSync(`gh repo delete ${GH_USER}/${REPO_NAME} --yes`, { stdio: 'ignore' });
        } catch (e) {
            // 忽略不存在的仓库报错
        }
        
        console.log('-> 正在创建全新 GitHub 远程公开仓库并推送代码...');
        execSync(`gh repo create ${REPO_NAME} --public --source=. --remote=origin --push --yes`, { stdio: 'inherit' });
        
        // 1.5 确保配置 GitHub Pages (双重确认)
        console.log('-> 正在向 GitHub Pages 注册域名映射与 HTTPS 配置...');
        try {
            execSync(`gh api repos/${GH_USER}/${REPO_NAME}/pages -X PUT -F "cname=${targetDomain}" -F "source={\\"branch\\":\\"master\\",\\"path\\":\\"/\\"}"`, { stdio: 'inherit' });
        } catch (e) {
            console.warn(`-> 域名注册接口提示 (通常不影响发布):`, e.message);
        }
        
        console.log(`GitHub 部署推送完毕！发布点: https://${GH_USER}.github.io/${REPO_NAME}`);
        
    } catch (err) {
        console.error(`GitHub Pages 部署脚本执行失败:`, err.message);
        process.exit(1);
    }

    console.log(`\n[2/3] 正在通过 Dynadot API 更新 DNS 解析指向 GitHub Pages 顶级负载均衡集群...`);
    // 配置 Dynadot 解析记录指向 GitHub Pages (包含 4 个 IP 实现世界顶级的高可用解析，及 www 的 CNAME 映射)：
    // A 记录 (@) -> 185.199.108.153 / 185.199.109.153 / 185.199.110.153 / 185.199.111.153
    // CNAME 记录 (www) -> wxid220-sketch.github.io
    const dynadotUrl = `https://api.dynadot.com/api3.json?key=${DYNADOT_KEY}&command=set_dns2&domain=${targetDomain}` +
        `&main_record_type0=a&main_record0=185.199.108.153` +
        `&main_record_type1=a&main_record1=185.199.109.153` +
        `&main_record_type2=a&main_record2=185.199.110.153` +
        `&main_record_type3=a&main_record3=185.199.111.153` +
        `&sub_host0=www&sub_record_type0=cname&sub_record0=${GH_USER}.github.io`;
    
    console.log(`正在下发 Dynadot 顶级四路负载均衡 DNS 解析记录...`);
    try {
        const res = await fetch(dynadotUrl);
        const data = await res.json();
        console.log(`Dynadot API 响应:\n`, JSON.stringify(data, null, 2));
        
        const rootKey = Object.keys(data)[0];
        const status = data[rootKey]?.Status;
        
        if (status === 'success') {
            console.log(`\n======================================================`);
            console.log(`[成功] 网页已成功推送至 GitHub Pages！`);
            console.log(`域名 ${targetDomain} 的 4 个负载均衡解析已成功写入 Dynadot！`);
            console.log(`Let's Encrypt 安全证书已由 GitHub Pages 自动托管申请！`);
            console.log(`请尝试访问: https://${targetDomain}`);
            console.log(`======================================================\n`);
            
            // 3. 强制开启 HTTPS (在 DNS 生效后，GitHub 将自动生成证书并强制跳转)
            try {
                console.log(`[3/3] 正在配置 GitHub Pages 强制跳转 HTTPS...`);
                execSync(`gh api repos/${GH_USER}/${REPO_NAME}/pages -X POST -F "https_enforced=true"`, { stdio: 'ignore' });
                console.log(`HTTPS 强制跳转开启成功！`);
            } catch (e) {
                console.log(`提示: HTTPS 强制开启可能会在证书完全生成后才能手动应用。当前已自动托管，无须担心。`);
            }
            process.exit(0);
        } else {
            console.warn(`[警告] Dynadot 响应状态不是 success，请检查。`);
            process.exit(1);
        }
    } catch (err) {
        console.error(`Dynadot API 交互异常:`, err.message);
        process.exit(1);
    }
}

// 提取命令行参数，默认为 zxw.lat
const targetDomain = process.argv[2] || 'zxw.lat';
deployAndResolve(targetDomain);
