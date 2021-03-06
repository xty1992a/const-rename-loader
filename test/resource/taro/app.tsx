import Taro, { Config, Component } from "@tarojs/taro";
import { Provider } from "@tarojs/redux";
import { store } from "./store";

// page
import Index from "./page/mainPage/pages/allHouseList/main";

// style
import "./app.less";
import "./custom-tab-bar/component/index.less";

// utils
import {
  handleExtConfig,
  handleGlobalData,
  initApp,
  handleWxCallback,
  handleWxEmitter,
  handleSystemInfo,
  handleClipboardData,
  handleMultipleProject,
  handleCompatibility,
  handleRouter,
  handleToast,
} from "@src/utils/app";
import { errorPost, queryString } from "@utils/util";
import { preFetchHouseData } from "@utils/pre_fetch_house_data";
import "@utils/log_tracker";
import "@utils/taro_page_hooks";

class App extends Component {
  config: Config = {
    pages: [
      "page/mainPage/pages/allHouseList/main",
      "page/mainPage/pages/entry/main",
      "page/mainPage/pages/my/main",
      "page/mainPage/pages/projectList/main",
      "page/mainPage/pages/message/main",
      "page/mainPage/pages/blank/main",
      "page/mainPage/pages/blankTab/main",
      "page/mainPage/pages/blankTab2/main",
      "page/mainPage/pages/webview/main",
      "page/mainPage/pages/webview2/main",
      "page/mainPage/pages/webview_pure/main",
    ],
    subPackages: [
      /** internal placeholder start */
      {
        root: "subpackages/broker",
        pages: [
          "pages/agreement/index",
          "pages/customer_detail/index",
          "pages/customer_edit/index",
          "pages/customer_list/index",
          "pages/intention/index",
          "pages/invite_list/index",
          "pages/project/index",
          "pages/register/index",
          "pages/report/index",
          "pages/role_select/index",
          "pages/role_select/supplement",
          "pages/router/index",
          "pages/sale/index",
        ],
      },
      /** internal placeholder end */
      // independent
      {
        root: "subpackages/independent/bind_user_msg/",
        pages: ["index"],
      },
      {
        root: "subpackages/independent/project/",
        pages: ["main/index", "house_type/index", "preview/index"],
      },
      {
        root: "subpackages/independent/house_album/",
        pages: ["index"],
      },
      {
        root: "subpackages/independent/sign_desk/",
        pages: ["index"],
      },
      {
        root: "subpackages/independent/find_detail/",
        pages: ["index"],
      },
      // ?????????????????????
      {
        root: "subpackages/independent/share_poster_entry/",
        pages: ["index"],
      },
      {
        root: "subpackages/independent/card/",
        pages: ["index"],
      },
      {
        root: "subpackages/independent/wx_pay/",
        pages: ["index", "transit/index"],
      },
      {
        root: "subpackages/independent/appointment_verify/",
        pages: ["index"],
      },
      {
        root: "subpackages/independent/delivery_appointment_verify/",
        pages: ["index"],
      },
      {
        root: "subpackages/independent/note_detail/",
        pages: ["index"],
      },
      // other
      {
        root: "subpackages/other/",
        pages: [
          "expired_qrcode/index",
          "map_navigation/index",
          "risk_control_protocol_h5/index",
        ],
      },
      // ??????
      {
        root: "subpackages/pin_talk/",
        pages: ["pages/xsdj_webview/main", "pages/video_viewing_house/main"],
      },
      // im
      {
        root: "subpackages/im/",
        pages: [
          "chatList/index",
          "chat/index",
          "save_common_exp/index",
          "manage_common_exp/index",
        ],
      },
      // customer service
      {
        root: "subpackages/customer_service/",
        pages: ["customer_chat/index"],
        // @ts-ignore
        plugins: {
          // ??????????????????????????????????????????
          WechatSI: {
            provider: "wx069ba97219f66d99",
            version: "0.3.4",
          },
          openaiwidget: {
            provider: "wx8c631f7e9f2465e1",
            version: "1.2.22",
          },
        },
      },
      // ??????100??????
      {
        root: "subpackages/expressage/",
        pages: ["kd_plugin/index"],
        // @ts-ignore
        plugins: {
          kdPlugin: {
            provider: "wx6885acbedba59c14",
            version: "1.0.1",
          },
        },
      },
      // seller main
      {
        root: "subpackages/seller/main/",
        pages: [
          "customer/index",
          "data_statistics/index",
          "message_proxy/index",
          "myself/index",
          "work_space/index",
        ],
      },
      // seller ?????????
      {
        root: "subpackages/seller/operation/",
        pages: [
          "activity_center/index",
          "articles/index",
          "article_detail/index",
          "customize_card/index",
          "digital_gallery/index",
          "digital_gallery_search/index",
          "mission/index",
          "mission_detail/index",
          "note/index",
          "note_poster_template/index",
          "package/index",
          "poster_detail/index",
          "poster_house_types/index",
          "poster_list/index",
          "project_estate/index",
          "video_poster/index",
          "video_detail/index",
          "publish_dynamic/index",
          "share_list/index",
          "visitor_list/index",
          "clue_list/index",
          "material_center/index", //????????????
          "material_center_more/index", //??????????????????????????????
          "took_detail/index",
          "share_articles/index",
          "add_article/index",
          "share_article_detail/index",
          "tookeen_tools/index",
        ],
      },
      // seller ??????
      {
        root: "subpackages/seller/customer/",
        pages: ["customer_detail/index", "customer_report/index"],
      },
      // seller ??????
      {
        root: "subpackages/seller/data/",
        pages: [
          "direct_list/index",
          "get_client_detail/index",
          "points_details/index",
        ],
      },
      // seller ??????
      {
        root: "subpackages/seller/my/",
        pages: [
          "account/index",
          "account_avatar/index",
          "account_banner/index",
          "account_education/index",
          "account_setting/index",
          "account_wechat_qrcode/index",
          "account_wechat_qrcode/result",
          "project_select/index",
          "edit_projects/index",
          "edit_dynamics/index",
        ],
      },
      // seller ????????????
      {
        root: "subpackages/seller/kol/",
        pages: [
          "kol/index",
          "kol_personal/index",
          "kol_register/index",
          "kol_task_detail/index",
        ],
      },
      // seller ??????
      {
        root: "subpackages/seller/other/",
        pages: ["signin/index", "vrairplay/index", "ydxs_signin/index"],
      },
      // project_relative
      {
        root: "subpackages/project_relative/",
        pages: [
          "appointment_form/index",
          "delivery_appointment_form/index",
          "broker_rule/index",
          "find/index",
          "house_detail/index",
          "news_list/index",
          "overview_preview/index",
          "poi/index",
          "public_activity_list/index",
          "sale_list/index",
          "type_list/index",
          "video_detail/index",
          "message/index",
        ],
      },
      // module_relative
      {
        root: "subpackages/module_relative/",
        pages: [
          "act_form/index",
          "activity/index",
          "area_list/index",
          "article_list/index",
          "buy_house/index",
          "card_projects/index",
          "city_list/index",
          "coupon_activity/index",
          "coupon_receive/index",
          "events_list/index",
          "favorites/index",
          "preview_image/index",
          "project_map/index",
          "recommend/index",
          "public_coupon_list/index",
          "video/index",
          "search_list/index",
          "house/index",
        ],
      },
      // mine
      {
        root: "subpackages/mine/",
        pages: [
          "auth_login/index",
          "bind_custom_phone/index",
          "setting/index",
          "coupon_list/index",
        ],
      },
      // mine_module_relative
      {
        root: "subpackages/mine_module_relative/",
        pages: [
          "activity_list/index",
          "cards/index",
          "feed_back/index",
          "introduce_list/index",
          "my_appointments/index",
          "my_delivery_appointments/index",
          "purchase_process/index",
          "share_record/index",
          "customer_list/index",
          "picture_page/index",
        ],
      },
      // auth
      {
        root: "subpackages/auth/",
        pages: ["bind_phone/index", "bind_user_info/index"],
      },
      // share
      {
        root: "subpackages/share/",
        pages: [
          "picture_save/canvas",
          "picture_save/canvas2c",
          "picture_save/json2canvas",
          "picture_save/index",
        ],
      },
      // vip ??????
      {
        root: "subpackages/vip_cloud/",
        pages: ["incentive_list/index"],
      },
      // // vip ???????????????
      // {
      //   root: 'paas/vip/',
      //   pages: ['index'],
      // },
      // // activity ???????????????
      // {
      //   root: 'paas/activity/',
      //   pages: ['index'],
      // },
    ],
    preloadRule: {
      "page/mainPage/pages/entry/main": {
        packages: ["subpackages/independent/project/"],
        network: "all",
      },
      "page/mainPage/pages/allHouseList/main": {
        packages: [
          "subpackages/independent/project/",
          "subpackages/module_relative/",
        ],
        network: "all",
      },
      "page/mainPage/pages/my/main": {
        packages: [
          "subpackages/mine_module_relative/",
          "subpackages/mine/",
          // 'subpackages/broker/'
        ],
        network: "all",
      },
      "subpackages/independent/project/main/index": {
        packages: ["subpackages/project_relative/", "subpackages/pin_talk/"],
        network: "all",
      },
      "subpackages/independent/note_detail/index": {
        packages: ["subpackages/independent/card/"],
        network: "all",
      },
      "subpackages/independent/find_detail/index": {
        packages: ["subpackages/independent/card/"],
        network: "all",
      },
      "subpackages/seller/main/work_space/index": {
        packages: ["subpackages/im/", "subpackages/seller/operation/"],
        network: "all",
      },
      "subpackages/seller/main/customer/index": {
        packages: ["subpackages/seller/customer/"],
        network: "all",
      },
      "subpackages/seller/main/data_statistics/index": {
        packages: ["subpackages/seller/data/"],
        network: "all",
      },
      "subpackages/seller/main/myself/index": {
        packages: ["subpackages/seller/my/"],
        network: "all",
      },
    },
    window: {
      backgroundTextStyle: "light",
      navigationBarBackgroundColor: "#fff",
      navigationBarTextStyle: "black",
      navigationStyle: "custom",
      enablePullDownRefresh: false,
    },
    tabBar: {
      custom: true,
      list: [
        {
          pagePath: "page/mainPage/pages/allHouseList/main",
          text: "??????",
        },
        {
          pagePath: "page/mainPage/pages/projectList/main",
          text: "??????",
        },
      ],
    },
    permission: {
      "scope.userLocation": {
        desc: "????????????????????????????????????????????????",
      },
    },
    // @ts-ignore
    singlePage: {
      navigationBarFit: "squeezed", //???????????????????????????
    },
  };

  componentDidMount() {
    // ?????????????????????????????????????????????????????????????????????????????????
    preFetchHouseData();
    // ??????ext??????
    handleExtConfig();
    // TODO: ??????????????????????????????????????????Redux????????????
    handleGlobalData();
    // ??????????????????
    handleWxCallback();
    // ??????Emitter
    handleWxEmitter();
    // ????????????
    handleSystemInfo();
    // api??????
    handleCompatibility();
    // ?????????????????????
    handleRouter();
    // ??????????????????
    handleToast();
    // ??????????????????
    handleClipboardData();
    // onLaunch(params) ????????? params
    const params = Taro.getLaunchOptionsSync();
    console.log("-----?????????????????????---------", params);
    // ???????????????????????? entry ????????????????????????????????????????????? entry??????????????????????????????
    params.path !== "page/mainPage/pages/entry/main" && initApp(params);
    // ???????????????
    handleMultipleProject();
  }

  componentDidNotFound({ path, query = {}, isEntryPage }) {
    Taro.redirectTo({
      url: `/page/mainPage/pages/entry/main${queryString({
        ...query,
        path,
        isEntryPage,
      })}`,
    });
  }

  componentDidCatchError(e) {
    errorPost({
      code: 100001,
      msg: "????????????????????????",
      detail: e,
    });
  }

  render() {
    return (
      <Provider store={store}>
        <Index />
      </Provider>
    );
  }
}

Taro.render(<App />, document.getElementById("app"));
