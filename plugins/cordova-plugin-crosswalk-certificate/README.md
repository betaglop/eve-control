Cordova Plugin Crosswalk Certificate
====================================

[Cordova](http://cordova.apache.org) plugin to enable the use of untrusted (self-signed) SSL Certificates.

## Install

To use this plugin with cordova-android 3.x install v1.x, which is compatible with the [crosswalk web view](https://crosswalk-project.org/) v10.x used with cordova-android v3.x

```
cordova plugin add cordova-plugin-crosswalk-certificate@1.0.0
```

To use this plugin with cordova-android 4.x install v2.x, which is compatbile with the new [pluggable crosswalk webview](https://crosswalk-project.org/documentation/cordova/cordova_4.html)
```
cordova plugin add cordova-plugin-crosswalk-certificate@2.0.0
```

You can install the latest build directly from git:
```
cordova plugin add https://github.com/danjarvis/cordova-plugin-crosswalk-certificate
```

## Usage

Activate insecure certificates
```
cordova.plugins.certificates.trustUnsecureCerts(true);
```

Dectivate insecure certificates
```
cordova.plugins.certificates.trustUnsecureCerts(false);
```

## Development

### Running integration tests

execute the `runIntegrationTests.sh` script for a specific platform:

```
PLATFORM='android' ./runIntegrationTests.sh
```

```
PLATFORM='ios' ./runIntegrationTests.sh
```

