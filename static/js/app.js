function genUid() {
    /* 生成用户id，自带校验  */
    const sec_key = "bDNsU3BxNXM2b1NyRFJ0dFQwa1o="; // l3lSpq5s6oSrDRttT0kZ
    const sec_ver = 'MDA='; // 00
    const uuid_str = uuid.v4();
    const sign = md5(uuid_str + atob(sec_key)).substring(0, 10)
    return uuid_str + atob(sec_ver) + sign
}

function getOrSetUid() {
    const uid = localStorage.getItem('UID');
    if (uid) {
        return uid;
    } else {
        localStorage.setItem('UID', genUid());
    }
    return localStorage.getItem('UID');
}

function hasReadArticle(id) {
    return localStorage.getItem('READ/' + id);
}

function setReadArticle(id) {
    localStorage.setItem('READ/' + id, '1');
}

function getSubFeeds() {
    const subFeeds = localStorage.getItem('SUBS');
    if (subFeeds) {
        return JSON.parse(subFeeds);
    }
    return {};
}

function getUnsubFeeds() {
    const unsubFeeds = localStorage.getItem('UNSUBS');
    if (unsubFeeds) {
        return JSON.parse(unsubFeeds);
    }
    return {};
}

function subFeed(name) {
    // 订阅
    const subFeeds = getSubFeeds();
    const unsubFeeds = getUnsubFeeds();

    delete unsubFeeds[name];
    subFeeds[name] = 1;

    localStorage.setItem('SUBS', JSON.stringify(subFeeds));
    localStorage.setItem('UNSUBS', JSON.stringify(unsubFeeds));
}

function unsubFeed(name) {
    // 取消订阅
    const subFeeds = getSubFeeds();
    const unsubFeeds = getUnsubFeeds();

    delete subFeeds[name];
    unsubFeeds[name] = 1;

    localStorage.setItem('SUBS', JSON.stringify(subFeeds));
    localStorage.setItem('UNSUBS', JSON.stringify(unsubFeeds));
}

function enterFullscreen() {
    /* 全屏 */
    const el = document.documentElement;
    const rfs = el.requestFullscreen || el.webkitRequestFullScreen || el.mozRequestFullScreen || el.msRequestFullscreen;
    rfs.call(el);
}

function isInFullscreen() {
    /* 是否全屏 */
    return (document.fullscreenElement && document.fullscreenElement !== null) ||
        (document.webkitFullscreenElement && document.webkitFullscreenElement !== null) ||
        (document.mozFullScreenElement && document.mozFullScreenElement !== null) ||
        (document.msFullscreenElement && document.msFullscreenElement !== null);
}


function exitFullscreen() {
    /* 退出全屏 */
    try {
        if (document.exitFullscreen) document.exitFullscreen();
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
        else if (document.mozCancelFullScreen) document.mozCancelFullScreen();
        else if (document.msExitFullscreen) document.msExitFullscreen();
    } catch(err) {
        console.warn("退出全屏时遇到异常", err.msg)
    }
    return true;
}

function getPageSize() {
    console.log($(window).height(), $('#omrss-footer').height(), $('#omrss-header').height());
    let pageSize = localStorage.getItem('PAGESIZE');
    if (pageSize) {
        return pageSize;
    } else {
        pageSize = Math.floor(($(window).height() - $('#omrss-footer').height() - $('#omrss-header').height() -
            60 - 16*1.5) / 70);
        localStorage.setItem('PAGESIZE', pageSize);
        return pageSize;
    }
}

function initLayout(){
    $('.tooltipped').tooltip();

    // 使页面主内容区域获得焦点，这样快捷键就生效了
    $('#omrss-main').click();
}

function loadPage(page){
    $('#omrss-loader').removeClass('hide');

    $.post("/api/ajax/myarticles", {uid: getOrSetUid(), page_size: getPageSize(), page: page,
        sub_feeds: Object.keys(getSubFeeds()).join(','), unsub_feeds: Object.keys(getUnsubFeeds()).join(',')}, function (data) {
        let destDom = $(data);
        // 是否已读
        destDom.find('.collection li[id]').each(function(index) {
            if (hasReadArticle(this.id)) {
                const target = $(this).find('i.unread');
                target.removeClass('unread').addClass('read');
                target.text('check');
            }
        });
        // 时间更新
        destDom.find(".prettydate").prettydate();
        $('#omrss-left').html(destDom);
        initLayout();
    }).fail(function(xhr) {
        M.toast({html: xhr.responseText, displayLength: 3000});
    }).always(function () {
        $('#omrss-loader').addClass('hide');
    });
}

$(document).ready(function () {
    /* 样式初始化开始 */
    initLayout();
    /* 样式初始化结束 */

    /* 登录初始化 TODO 特性支持检测 */
    getOrSetUid();
    /* 登录初始化结束 */

    // 加载列表内容
    loadPage(1);

    /* 事件处理开始 */
    // 文章内容点击，事件委托
    $(document).on('click', '.ev-cnt-list', function () {
        // UI状态切换
        $('.ev-cnt-list.active').removeClass('active');
        $(this).addClass('active');
        $('#omrss-loader').removeClass('hide');

        const article_id = this.id;
        const ev_target = $(this);

        // 网络请求
        $.post("/api/html/article", {uid: getOrSetUid(), id: article_id}, function (data) {
            $('#omrss-main').html(data);
            $('#omrss-main').scrollTop(0);

            if (hasReadArticle(article_id)) {
                // 已经是已读了
            } else {
                // 未读变为已读
                setReadArticle(article_id);
                const target = ev_target.find('i.unread');
                target.removeClass('unread').addClass('read');
                target.text('check');
            }
        }).always(function () {
            $('#omrss-loader').addClass('hide');
        })
    });

    // 我的订阅点击
    $('.ev-my-feed').click(function () {
        $('#omrss-loader').removeClass('hide');

        $.post("/api/html/feeds", {uid: getOrSetUid()}, function (data) {
            let destDom = $(data);
            const subFeeds = getSubFeeds();
            const unsubFeeds = getUnsubFeeds();

            destDom.find('.omrss-item').each(function (index) {
                const siteName = $(this).attr('data-name');
                const siteStar = parseInt($(this).attr('data-star'));

                if (siteName in subFeeds) {
                    // 取消订阅
                    $(this).find('a.ev-toggle-feed').text('取消订阅');
                } else if (siteName in unsubFeeds){
                    // 订阅
                    $(this).find('a.ev-toggle-feed').text('订阅');
                } else {
                    // 根据推荐决定
                    if (siteStar >= 20) {
                        // 取消订阅
                        $(this).find('a.ev-toggle-feed').text('取消订阅');
                    } else {
                        // 订阅
                        $(this).find('a.ev-toggle-feed').text('订阅');
                    }
                }
            });

            $('#omrss-main').html(destDom).scrollTop(0);

        }).always(function () {
            $('#omrss-loader').addClass('hide');
        });
    });

    // 切换订阅状态，事件委托
    $(document).on('click', '.ev-toggle-feed', function () {
        const curStat = $(this).text();
        const feedName = $(this).attr('data-name');

        if (curStat === '订阅') {
            subFeed(feedName);
            M.toast({html: '订阅成功', displayLength: 1000});
            $(this).text('取消订阅');
        } else if (curStat === '取消订阅') {
            unsubFeed(feedName);
            M.toast({html: '取消订阅成功', displayLength: 1000});
            $(this).text('订阅');
        }
    });

    // 翻页处理
    $(document).on('click', '.ev-page', function () {
        const page = $(this).attr('data-page');
        loadPage(page);
    });

    // 设置页面
    $('.ev-settings').click(function () {
        $('#omrss-loader').removeClass('hide');
        $.post("/api/html/settings", {uid: getOrSetUid()}, function (data) {
            $('#omrss-main').html(data);
            $('#omrss-main').scrollTop(0);
        }).always(function () {
            $('#omrss-loader').addClass('hide');
        })
    });

    // 切换全屏
    $('.ev-toggle-fullscreen').click(function () {
        if (isInFullscreen()){
            exitFullscreen();
            $(this).find('i').text('fullscreen');
        } else {
            enterFullscreen();
            $(this).find('i').text('fullscreen_exit');
        }
    });

    /* 事件处理结束 */
});