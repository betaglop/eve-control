/*
 
 The MIT License (MIT)
 
 Copyright (c) 2014 Martin Reinhardt
 Copyright (c) 2015 Daniel Jarvis
 
 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:
 
 The above copyright notice and this permission notice shall be included in all
 copies or substantial portions of the Software.
 
 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 SOFTWARE.
 
 Certificate Plugin for Cordova Compatibile with Crosswalk v10.x
 
 */
package com.danjarvis.cordova.plugins;

import org.apache.cordova.CordovaInterface;
import org.apache.cordova.CordovaWebView;

import android.net.http.SslError;
import android.util.Log;
import android.webkit.SslErrorHandler;
import android.webkit.WebView;
import android.webkit.ValueCallback;

import org.xwalk.core.XWalkView;
import org.xwalk.core.XWalkResourceClient;

import org.crosswalk.engine.XWalkCordovaResourceClient;
import org.crosswalk.engine.XWalkWebViewEngine;

/**
 * 
 * Certificates Cordova XWalkView Client
 * 
 * authors: Martin Reinhardt on 23.06.14
 *          Daniel Jarvis updated on 2015-05-08
 *
 * 
 * Copyright Martin Reinhardt 2014
 * Copyright Daniel Jarvis 2015
 *
 * All rights reserved.
 * 
 */
public class CertificatesCordovaWebViewClient extends XWalkCordovaResourceClient {

    /**
     * Logging Tag
     */
    public static final String LOG_TAG = "CertificatesCordovaWebViewClient";

    private boolean allowUntrusted = false;

    /**
     * @param parentEngine
     */
    public CertificatesCordovaWebViewClient(XWalkWebViewEngine parentEngine) {
        super(parentEngine);
    }

    /**
     * @return true of usage of untrusted (self-signed) certificates is allowed,
     *         otherwise false
     */
    public boolean isAllowUntrusted() {
        return allowUntrusted;
    }

    /**
     * @param pAllowUntrusted
     *            the allowUntrusted to set
     */
    public void setAllowUntrusted(final boolean pAllowUntrusted) {
        this.allowUntrusted = pAllowUntrusted;
    }

    /**
     * See: http://ivancevich.me/articles/ignoring-invalid-ssl-certificates-on-cordova-android-ios/
     */
    @Override
    public void onReceivedSslError(XWalkView view, ValueCallback<Boolean> callback, SslError error) {
        Log.d(LOG_TAG, "Received SSL Error :: " + error.toString());
        if (isAllowUntrusted())
            callback.onReceiveValue(true);
        else
            callback.onReceiveValue(false);
    }
}
