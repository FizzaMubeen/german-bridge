<?php
/**
 * Plugin Name:       German Bridge
 * Plugin URI:        https://github.com/FizzaMubeen/german-bridge
 * Description:       Learn everyday German from Urdu, Hindi or English. Flashcards with pictures, personal word lists, progress tracking and printable PDF reports. Add it to any page with the shortcode [german_bridge].
 * Version:           1.0.0
 * Requires at least: 5.8
 * Requires PHP:      7.4
 * Author:            Fizza Mubeen
 * License:           MIT
 * Text Domain:       german-bridge
 *
 * Privacy: the app runs completely in the visitor's browser. It stores nothing on your server,
 * sets no cookies and loads nothing from outside your site.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'GERMAN_BRIDGE_VERSION', '1.0.0' );

/**
 * URL of the bundled app.
 */
function german_bridge_app_url() {
	return plugins_url( 'app/index.html', __FILE__ );
}

/**
 * [german_bridge height="820" link="yes"]
 *
 * height  Height of the app frame in pixels (400–2000). Default 820.
 * link    "yes" shows an "Open full screen" link under the app. Default yes.
 */
function german_bridge_shortcode( $atts ) {
	$atts = shortcode_atts(
		array(
			'height' => '820',
			'link'   => 'yes',
		),
		$atts,
		'german_bridge'
	);

	$height = max( 400, min( 2000, absint( $atts['height'] ) ) );
	$url    = german_bridge_app_url() . '?v=' . rawurlencode( GERMAN_BRIDGE_VERSION ) . '#today';

	$html  = '<div class="german-bridge-embed" style="max-width:100%;">';
	$html .= sprintf(
		'<iframe src="%1$s" title="%2$s" loading="lazy" style="width:100%%;height:%3$dpx;max-height:92vh;border:0;border-radius:16px;display:block;" referrerpolicy="no-referrer"></iframe>',
		esc_url( $url ),
		esc_attr__( 'German Bridge – learn German', 'german-bridge' ),
		$height
	);
	if ( 'yes' === strtolower( $atts['link'] ) ) {
		$html .= sprintf(
			'<p style="text-align:right;font-size:14px;margin:6px 0 0;"><a href="%1$s" target="_blank" rel="noopener">%2$s</a></p>',
			esc_url( german_bridge_app_url() ),
			esc_html__( 'Open full screen ↗', 'german-bridge' )
		);
	}
	$html .= '</div>';

	return $html;
}
add_shortcode( 'german_bridge', 'german_bridge_shortcode' );

/**
 * Small help box on the Plugins screen.
 */
function german_bridge_row_meta( $links, $file ) {
	if ( plugin_basename( __FILE__ ) === $file ) {
		$links[] = esc_html__( 'Use shortcode: [german_bridge]', 'german-bridge' );
		$links[] = '<a href="' . esc_url( german_bridge_app_url() ) . '" target="_blank" rel="noopener">' . esc_html__( 'Open the app', 'german-bridge' ) . '</a>';
	}
	return $links;
}
add_filter( 'plugin_row_meta', 'german_bridge_row_meta', 10, 2 );
